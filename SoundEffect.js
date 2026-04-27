(function() {
    console.log("正在注入多段均衡重低音拦截器");

    // 全局变量存储上下文和输入节点
    let context;
    let chainInput; // 音频进入处理链路的入口

    function initAudioContext() {
        if (context) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();

        // --- 你的定制参数配置区域 ---

        // 1. 极低频增强（Low Shelf）- 负责轰头感
        const lowshelf = context.createBiquadFilter();
        lowshelf.type = 'lowshelf';
        lowshelf.frequency.value = 60;
        lowshelf.gain.value = 10;

        // 2. 低频增强（Peaking）- 负责鼓点的打击感
        const peaking1 = context.createBiquadFilter();
        peaking1.type = 'peaking';
        peaking1.frequency.value = 120;
        peaking1.gain.value = 6;
        peaking1.Q.value = 0.8;

        // 3. 中低频增强（Peaking）- 增加厚度
        const peaking2 = context.createBiquadFilter();
        peaking2.type = 'peaking';
        peaking2.frequency.value = 250;
        peaking2.gain.value = 4;
        peaking2.Q.value = 0.5;

        // 4. 高频衰减（High Shelf）- 压暗中高频，突出低音
        const highshelf = context.createBiquadFilter();
        highshelf.type = 'highshelf';
        highshelf.frequency.value = 200;
        highshelf.gain.value = -3;

        // 5. 动态压缩器（防失真）- 保护音质
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 4;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.2;

        // --- 连接链路 ---
        // 信号流向: Source -> LowShelf -> Peaking1 -> Peaking2 -> HighShelf -> Compressor -> 扬声器

        lowshelf.connect(peaking1);
        peaking1.connect(peaking2);
        peaking2.connect(highshelf);
        highshelf.connect(compressor);
        compressor.connect(context.destination);

        // 设置链路入口
        chainInput = lowshelf;

        console.log("音频处理链已构建");
    }

    // 劫持 HTMLMediaElement 的 src 属性
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');

    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        get: function() {
            return originalSrcDescriptor.get.call(this);
        },
        set: function(value) {
            console.log("拦截到音频加载请求:", value);

            // 1. 强制开启跨域许可
            this.crossOrigin = "anonymous";

            // 2. 调用原始逻辑加载歌曲
            originalSrcDescriptor.set.call(this, value);

            // 3. 挂载我们的处理链
            setTimeout(() => {
                try {
                    initAudioContext();

                    // 激活 AudioContext (防止浏览器策略暂停它)
                    if (context.state === 'suspended') {
                        context.resume();
                    }

                    // 防止重复连接
                    if (!this._bassBoosted) {
                        const source = context.createMediaElementSource(this);
                        // 连接到我们链路的入口（LowShelf）
                        source.connect(chainInput);
                        this._bassBoosted = true;
                        console.log("音效已加载：自定义重低音模式");
                    }
                } catch (err) {
                    console.error("挂载失败 (可能是CORS限制):", err);
                }
            }, 100);
        }
    });

    console.log("拦截器就绪！请点击播放一首新歌来体验效果。");
})();
