var isLogin=false;
var useridq=null;

// 从 localStorage 获取用户提供的 Cookie（用于请求头）
function getUserProvidedCookie() {
    let cookie = localStorage.getItem('user_cookie') || '';
    // 移除所有非 ASCII 字符（>255）和常见干扰字符
    cookie = cookie.split('').filter(char => char.charCodeAt(0) <= 255).join('');
    // 可选：移除多余空格
    cookie = cookie.replace(/\s+/g, ' ').trim();
    return cookie;
}

// 格式化播放次数
function formatPlayCount(count) {
    if (count >= 100000000) {
        return (count / 100000000).toFixed(1) + '亿';
    } else if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万';
    } else {
        return count.toString();
    }
}

// 创建音乐卡片函数
function createMusicCard(title, imageUrl, playCount, id, type) {
    let col = document.createElement('div');
    col.className = 'mdui-col-xs-6 mdui-col-sm-4 mdui-col-md-2 mdui-m-b-4';

    let card = document.createElement('div');
    card.className = 'music-card mdui-card mdui-hoverable';
    card.style.width = '100%';

    let coverContainer = document.createElement('div');
    coverContainer.className = 'album-cover';
    coverContainer.style.backgroundImage = `url(${imageUrl})`;

    let content = document.createElement('div');
    content.className = 'mdui-card-content';

    let titleElement = document.createElement('div');
    titleElement.className = 'mdui-typo mdui-text-truncate';
    titleElement.textContent = title;

    content.appendChild(titleElement);

    if (playCount !== null && playCount !== undefined) {
        let playCountElement = document.createElement('div');
        playCountElement.className = 'mdui-typo mdui-text-sm mdui-text-color-gray-500';
        playCountElement.innerHTML = `<i class="fa fa-play-circle-o"></i> ${formatPlayCount(playCount)}`;
        content.appendChild(playCountElement);
    }

    card.appendChild(coverContainer);
    card.appendChild(content);
    col.appendChild(card);

    // 添加点击事件
    card.onclick = function() {
        if (type == 'song') {
            if (globalSongIds.length > 0) {
                window.location.href = `play.html?id=${id}&ids=${globalSongIds.join(',')}`;
            } else {
                window.location.href = `play.html?id=${id}`;
            }
        } else if (type == 'playlist') {
            window.location.href = `playlist.html?id=${id}`;
        } else if (type == 'album') {
            window.location.href = `album.html?id=${id}`;
        } else if (type == 'djprogram') {
            mdui.alert("电台页面暂时不可用");
        }
    }
    return col;
}

// 获取每日推荐歌曲函数
function fetchDailyRecommendSongs() {
    fetchWithCookie(`/recommend/songs`)
    .then(response => response.json())
    .then(data => {
        if (data.code === 200 && data.data && data.data.dailySongs && data.data.dailySongs.length > 0) {
            let container = document.getElementById('dailyRecommendSongsContainer');
            container.innerHTML = '';
            // 提取所有 ID 并合并到 globalSongIds
            let songIds = data.data.dailySongs.map(item => item.id);
            globalSongIds = [...new Set([...globalSongIds, ...songIds])]; // 去重合并

            // 最多显示6首歌曲
            let displayCount = data.data.dailySongs.length;

            // 渲染卡片
            for (let i = 0; i < data.data.dailySongs.length; i++) {
                let item = data.data.dailySongs[i];
                let artists = item.ar.map(artist => artist.name).join(' / ');
                let card = createMusicCard(`${item.name} - ${artists}`, item.al.picUrl, null, item.id, 'song', true);
                container.appendChild(card);
            }
        } else {
            console.error('没有找到每日推荐歌曲数据');
        }
    })
    .catch(error => {
        console.error('获取每日推荐歌曲失败:', error);
    });
}

// 获取每日推荐歌单函数
function fetchDailyRecommendResource() {
    fetchWithCookie(`/recommend/resource`)
    .then(response => response.json())
    .then(data => {
        if (data.code === 200 && data.recommend && data.recommend.length > 0) {
            let container = document.getElementById('dailyRecommendResourceContainer');
            container.innerHTML = '';

            // 最多显示6个歌单
            let displayCount = Math.min(6, data.recommend.length);

            for (let i = 0; i < displayCount; i++) {
                let item = data.recommend[i];
                let card = createMusicCard(item.name, item.picUrl, item.playcount, item.id, 'playlist');
                container.appendChild(card);
            }
        } else {
            console.error('没有找到每日推荐歌单数据');
        }
    })
    .catch(error => {
        console.error('获取每日推荐歌单失败:', error);
    });
}

// 显示每日推荐内容
function showDailyRecommend() {
    globalSongIds = [];
    // 显示每日推荐区域
    document.getElementById('dailyRecommendSongsSection').style.display = 'block';
    document.getElementById('dailyRecommendResourceSection').style.display = 'block';
    // 加载每日推荐数据
    fetchDailyRecommendSongs();
    fetchDailyRecommendResource();
}

function showLogoutBtn() {
    document.getElementById('logoutBtn').style.display = 'block';
}

// 登录相关功能
document.addEventListener('DOMContentLoaded', function () {
    // 检查登录状态（使用 localStorage 中的 Cookie）
    let apiBaseUrl = ThemeManager.getApiBaseUrl();
    let timestamp = new Date().getTime();
    fetchWithCookie(`${apiBaseUrl}login/status?timestamp=${timestamp}`)
    .then(response => response.json())
    .then(data => {
        if (data.data.code === 200 && data.data.profile.userId) {
            // 已登录状态
            isLogin=true;
            useridq=data.data.profile.userId;
            showDailyRecommend();
            showLogoutBtn();
        } else {
            isLogin=false;
        }
    })
    .catch(error => {
        console.error('检查登录状态失败:', error);
    });

    // 初始化对话框
    let loginDialog = new mdui.Dialog('#loginDialog');
    let loginBtn = document.getElementById('loginBtn');
    let phoneLoginBtn = document.getElementById('phoneLoginBtn');
    let sendCaptchaBtn = document.getElementById('sendCaptchaBtn');
    let refreshQrBtn = document.getElementById('refreshQrBtn');
    let qrCodeContainer = document.getElementById('qrCodeContainer');
    let cookieLoginBtn = document.getElementById('cookieLoginBtn');
    let anonLoginBtn = document.getElementById('anonLoginBtn');
    let qrKey = '';
    let qrPollingInterval = null;

    // 打开登录模态框
    loginBtn.addEventListener('click', function () {
        if (isLogin === true) {
            window.location.href = `user.html?uid=${useridq}`;
        } else {
            loginDialog.open();
            generateQrCode();
        }

    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('user_cookie');
        mdui.snackbar({ message: '已退出登录' });
    });

    // Cookie 登录（重构版）
    cookieLoginBtn.addEventListener('click', function () {
        let cookie = document.getElementById('cookieInput').value.trim();
        if (!cookie) {
            mdui.snackbar({ message: '请输入 Cookie' });
            return;
        }

        // 保存到 localStorage
        localStorage.setItem('user_cookie', cookie);
        mdui.snackbar({ message: 'Cookie 已保存到本地存储' });

        // 验证登录状态
        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        let timestamp = new Date().getTime();
        fetchWithCookie(`${apiBaseUrl}login/status?timestamp=${timestamp}`)
        .then(response => response.json())
        .then(data => {
            if (data.data.code === 200 && data.data.profile) {
                mdui.snackbar({ message: '登录状态验证成功' });
                let loginStatusDialog = new mdui.Dialog(`
                <div class="mdui-dialog">
                <div class="mdui-dialog-title">登录状态</div>
                <div class="mdui-dialog-content">
                <p>用户名: ${data.profile.nickname}</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
                <div class="mdui-dialog-actions">
                <button class="mdui-btn mdui-ripple" onclick="this.parentElement.parentElement.close()">关闭</button>
                </div>
                </div>
                `);
                loginStatusDialog.open();
                loginDialog.close();

                // ✅ 启用每日推荐
                showDailyRecommend();
            } else {
                mdui.snackbar({ message: data.message || 'Cookie 无效或已过期' });
            }
        })
        .catch(error => {
            console.error('获取登录状态失败:', error);
            mdui.snackbar({ message: '网络错误或 Cookie 无效' });
        });
    });

    // 游客登录
    anonLoginBtn.addEventListener('click', function () {
        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        mdui.snackbar({ message: '正在获取游客 Cookie...' });

        fetch(`${apiBaseUrl}register/anonimous`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                mdui.snackbar({ message: '游客登录成功' });

                // 保存返回的 cookie（如果有）
                if (data.cookie) {
                    localStorage.setItem('user_cookie', data.cookie);
                }

                let loginResultDialog = new mdui.Dialog(`
                <div class="mdui-dialog">
                <div class="mdui-dialog-title">游客登录成功</div>
                <div class="mdui-dialog-content">
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <p class="mdui-m-t-2"><strong>Cookie:</strong> ${data.cookie || '未返回'}</p>
                </div>
                <div class="mdui-dialog-actions"></div>
                </div>
                `);
                loginResultDialog.open();
                loginDialog.close();

                // ✅ 启用每日推荐
                showDailyRecommend();
            } else {
                mdui.snackbar({ message: data.message || '游客登录失败' });
            }
        })
        .catch(error => {
            mdui.snackbar({ message: '网络错误，请重试' });
            console.error('Anonymous Login error:', error);
        });
    });

    // 手机登录（保留，尽管网易可能限制）
    phoneLoginBtn.addEventListener('click', function () {
        let phone = document.getElementById('phone').value;
        let password = document.getElementById('password').value;
        let countrycode = document.getElementById('countrycode').value || '86';
        let captcha = document.getElementById('captcha').value;

        if (!phone) {
            mdui.snackbar({ message: '请输入手机号' });
            return;
        }
        if (!password && !captcha) {
            mdui.snackbar({ message: '请输入密码或验证码' });
            return;
        }

        let params = { phone, countrycode };
        if (captcha) {
            params.captcha = captcha;
        } else {
            params.password = encodeURIComponent(password);
        }

        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        fetchWithCookie(apiBaseUrl + 'login/cellphone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                mdui.snackbar({ message: '登录成功' });
                if (data.cookie) {
                    localStorage.setItem('user_cookie', data.cookie);
                }
                let loginResultDialog = new mdui.Dialog(`
                <div class="mdui-dialog">
                <div class="mdui-dialog-title">登录成功</div>
                <div class="mdui-dialog-content"><pre>${JSON.stringify(data, null, 2)}</pre></div>
                <div class="mdui-dialog-actions">
                <button class="mdui-btn mdui-ripple" onclick="this.parentElement.parentElement.close()">关闭</button>
                </div>
                </div>
                `);
                loginResultDialog.open();
                loginDialog.close();
                showDailyRecommend(); // ✅ 启用
            } else {
                mdui.snackbar({ message: data.message || '登录失败' });
            }
        })
        .catch(error => {
            mdui.snackbar({ message: '网络错误，请重试' });
            console.error('Login error:', error);
        });
    });

    // 发送验证码
    sendCaptchaBtn.addEventListener('click', function () {
        let phone = document.getElementById('phone').value;
        let countrycode = document.getElementById('countrycode').value || '86';
        if (!phone) {
            mdui.snackbar({ message: '请输入手机号' });
            return;
        }

        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        fetch(`${apiBaseUrl}captcha/sent?phone=${phone}&countrycode=${countrycode}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                mdui.snackbar({ message: '验证码发送成功' });
                let countdown = 60;
                sendCaptchaBtn.disabled = true;
                sendCaptchaBtn.textContent = `重新发送(${countdown})`;
                let timer = setInterval(function () {
                    countdown--;
                    sendCaptchaBtn.textContent = `重新发送(${countdown})`;
                    if (countdown <= 0) {
                        clearInterval(timer);
                        sendCaptchaBtn.disabled = false;
                        sendCaptchaBtn.textContent = '获取验证码';
                    }
                }, 1000);
            } else {
                mdui.snackbar({ message: data.message || '验证码发送失败' });
            }
        })
        .catch(error => {
            mdui.snackbar({ message: '网络错误，请重试' });
            console.error('Send captcha error:', error);
        });
    });

    // 生成二维码
    function generateQrCode() {
        if (qrPollingInterval) {
            clearInterval(qrPollingInterval);
            qrPollingInterval = null;
        }

        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        fetch(apiBaseUrl + 'login/qr/key?timestamp=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                qrKey = data.data.unikey;
                return fetch(`${apiBaseUrl}login/qr/create?key=${qrKey}&qrimg=true&timestamp=${new Date().getTime()}`);
            } else {
                throw new Error('生成二维码 key 失败');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                let imgSrc = data.data.qrimg;
                if (!imgSrc.startsWith('data:image')) {
                    imgSrc = `data:image/png;base64,${imgSrc}`;
                }
                qrCodeContainer.innerHTML = `<img src="${imgSrc}" style="width: 180px; height: 180px;">`;
                startQrPolling();
            } else {
                throw new Error('生成二维码失败');
            }
        })
        .catch(error => {
            qrCodeContainer.innerHTML = `<p>${error.message}</p>`;
            console.error('Generate QR code error:', error);
        });
    }

    // 刷新二维码
    refreshQrBtn.addEventListener('click', generateQrCode);

    // 轮询扫码状态
    function startQrPolling() {
        let apiBaseUrl = ThemeManager.getApiBaseUrl();
        qrPollingInterval = setInterval(function () {
            fetch(`${apiBaseUrl}login/qr/check?key=${qrKey}&timestamp=${new Date().getTime()}`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 800) {
                    clearInterval(qrPollingInterval);
                    qrPollingInterval = null;
                    qrCodeContainer.innerHTML = '<p>二维码已过期，请刷新</p>';
                } else if (data.code === 802) {
                    qrCodeContainer.innerHTML = '<p>请在手机上确认登录</p>';
                } else if (data.code === 803) {
                    clearInterval(qrPollingInterval);
                    qrPollingInterval = null;
                    mdui.snackbar({ message: '登录成功' });
                    if (data.cookie) {
                        localStorage.setItem('user_cookie', data.cookie);
                    }
                    let loginResultDialog = new mdui.Dialog(`
                    <div class="mdui-dialog">
                    <div class="mdui-dialog-title">登录成功</div>
                    <div class="mdui-dialog-content"><pre>${JSON.stringify(data, null, 2)}</pre></div>
                    <div class="mdui-dialog-actions">
                    <button class="mdui-btn mdui-ripple" onclick="this.parentElement.parentElement.close()">关闭</button>
                    </div>
                    </div>
                    `);
                    loginResultDialog.open();
                    loginDialog.close();
                    showDailyRecommend(); // ✅ 启用
                }
            })
            .catch(error => {
                qrCodeContainer.innerHTML = '<p>检查扫码状态失败</p>';
                console.error('Check QR status error:', error);
            });
        }, 3000);
    }
});
