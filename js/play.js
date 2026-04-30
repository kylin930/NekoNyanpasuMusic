// 从URL获取参数
function getUrlParams() {
    let params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids');
    let ids = null;
    if (idsParam) {
        ids = idsParam.split(',').map(id => id.trim()).filter(id => id !== '');
    }
    return {
        songId: params.get('id'),
        playlistId: params.get('playlistId') || null,
        artistId: params.get('artistId') || null,
        mode: params.get('mode') || null,
        ids: ids || null
    };
}

// 格式化时间
function formatDuration(ms) {
    let minutes = Math.floor(ms / 60000);
    let seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 获取歌曲详情
function getSongDetail(id) {
    return fetch(`https://163api.ciallo.uk/song/detail?ids=${id}`)
    .then(response => response.json())
    .then(data => data);
}

// 获取歌单所有歌曲
function getPlaylistTracks(id) {
    return fetch(`https://api.qijieya.cn/meting/?type=playlist&id=${id}`)
    .then(response => response.json())
    .then(data => data);
}

function getPlaylistIntelligence(id,pid) {
    return fetchWithCookie(`/playmode/intelligence/list?id=${id}&pid=${pid}`)
    .then(response => response.json())
    .then(data => data);
}

// 获取当前登录用户的 UID（从 /login/status 接口）
async function getLoginUid() {
    try {
        const res = await fetchWithCookie('/login/status');
        const data = await res.json();
        if (data.data.code === 200) {
            return data.data.account.id.toString(); // 转为字符串，统一类型
        }
    } catch (error) {
        console.warn('获取登录状态失败:', error);
    }
    return null;
}

// 获取歌手歌曲
function getArtistSongs(id, limit=100) {
    return fetch(`https://163api.ciallo.uk/artist/songs?id=${id}&limit=${limit}`)
    .then(response => response.json())
    .then(data => data);
}

// 获取歌曲URL（使用新API，内置VIP解析与音质适配）
function getSongUrl(id) {
    // 强制标记为 true。
    // 因为新 API 返回的数据结构是数组形式 [{..., url: "..."}]
    // 这完美兼容了你在 loadSong 函数中 isVipUrl = true 时读取 urlData[0].url 的提取逻辑
    isVipUrl = true;

    // 从 localStorage 获取用户在设置页选的音质
    let musicQuality = localStorage.getItem('music-quality') || 'exhigh';
    let br = 320; // 默认码率 320

    // 将原有的音质等级转换为图片 API 支持的 br (2000/320/192/128)
    const highQualitySettings = ['lossless', 'hires', 'jymaster', 'sky', 'jyeffect'];
    if (highQualitySettings.includes(musicQuality)) {
        br = 2000; // 无损/母带等高音质映射为 2000
    } else if (musicQuality === 'higher') {
        br = 192;  // 较高音质映射为 192
    } else if (musicQuality === 'standard') {
        br = 128;  // 标准音质映射为 128
    } else {
        br = 320;  // exhigh (极高) 及其他未知情况默认映射为 320
    }

    // 使用图中的 Meting API，type=song 会返回包含歌曲信息的 JSON 数组
    let newApiUrl = `https://api.qijieya.cn/meting/?type=song&id=${id}&br=${br}`;

    return fetch(newApiUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`网络请求失败，状态码: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // 确保返回了有效数据
        if (!Array.isArray(data) || data.length === 0 || !data[0].url) {
            throw new Error('未返回有效的歌曲链接数据');
        }
        return data;
    })
    .catch(error => {
        console.error('获取歌曲链接失败:', error);
        throw error;
    });
}

// VIP解析请求函数 (GET方式)
async function getVipSongUrl(songId) {
    try {
        // 第一步：获取元数据（含代理 url）
        const metaRes = await fetchWithCookie(`https://api.qijieya.cn/meting/?type=song&id=${songId}`);
        if (!metaRes.ok) throw new Error(`元数据请求失败: ${metaRes.status}`);

        const metaList = await metaRes.json();
        if (!Array.isArray(metaList) || metaList.length === 0) {
            throw new Error('未返回有效歌曲数据');
        }

        return metaList;
    } catch (error) {
        console.error('VIP 解析失败:', error);
        throw error;
    }
}

function getLyrics(id) {
    return fetch(`https://api.qijieya.cn/meting/?server=netease&type=lrc&id=${id}`)
    .then(response => response.text()) // 接收纯文本并处理换行
    .then(text => text);
}

// 获取逐字歌词
function getLyricsNew(id) {
    return fetch(`https://163api.ciallo.uk/lyric/new?id=${id}`)
    .then(response => response.json())
    .then(data => data);
}

// 解析逐字歌词数据并包含逐行翻译
function parseLyricsWithTranslation(apiData) {
    if (!apiData) {
        return { wordLevelLyrics: [], translationMap: new Map() };
    }

    // 解析逐字歌词（从yrc字段）
    let wordLevelLyrics = [];
    if (apiData.yrc && apiData.yrc.lyric) {
        wordLevelLyrics = parseLyricsNew(apiData.yrc);
    }

    // 解析翻译歌词并按行分组 (从tlyric字段)
    let translationMap = new Map(); // key: lineStartTime, value: translation text
    if (apiData.tlyric && apiData.tlyric.lyric) {
        let translateLines = parseLrcLyrics(apiData.tlyric.lyric);

        // 获取所有逐字歌词的行起始时间
        let wordLineStartTimes = [...new Set(wordLevelLyrics.map(word => word.lineStartTime))];
        wordLineStartTimes.sort((a, b) => a - b);

        // 按时间接近度匹配翻译
        translateLines.forEach(translate => {
            // 找到最接近的行起始时间
            let closestTime = null;
            let minDiff = Infinity;

            for (const lineTime of wordLineStartTimes) {
                const diff = Math.abs(lineTime - translate.time);
                if (diff < minDiff && diff < 2000) { // 2秒内的差异才匹配
                    minDiff = diff;
                    closestTime = lineTime;
                }
            }

            if (closestTime !== null) {
                translationMap.set(closestTime, translate.text);
            }
        });

        console.log('解析到翻译歌词:', translateLines.length, '行，匹配到', translationMap.size, '行翻译');
    } else {
        console.log('没有找到翻译歌词数据');
    }

    return { wordLevelLyrics, translationMap };
}

// 解析LRC格式的翻译歌词
function parseLrcLyrics(lrcContent) {
    if (!lrcContent || !lrcContent.trim()) {
        return [];
    }

    let lines = lrcContent.split('\n');
    let translateLines = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 改进的正则表达式，支持 [mm:ss.xxx] 和 [mm:ss.xx] 以及 [mm:ss] 格式
        let timeMatch = line.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (timeMatch) {
            // 计算时间戳（毫秒）
            let minutes = parseInt(timeMatch[1]);
            let seconds = parseInt(timeMatch[2]);
            let milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0').slice(0, 3)) : 0;
            let timeMs = minutes * 60 * 1000 + seconds * 1000 + milliseconds;

            // 获取歌词内容（去掉所有时间标签）
            let lyricContent = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
            if (lyricContent) {
                translateLines.push({
                    time: timeMs,
                    text: lyricContent
                });
            }
        }
    });

    return translateLines;
}

// 解析逐字歌词 - 正确版本
function parseLyricsNew(yrcData) {
    if (!yrcData || !yrcData.lyric) {
        return [];
    }

    let parsedLyrics = [];
    let content = yrcData.lyric;

    // 首先处理JSON格式的元数据行
    let lines = content.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith('{"t":')) {
            try {
                let jsonData = JSON.parse(line);
                if (jsonData.c && Array.isArray(jsonData.c)) {
                    jsonData.c.forEach(item => {
                        if (item.tx) {
                            parsedLyrics.push({
                                time: jsonData.t || 0,
                                text: item.tx,
                                translate: '',
                                isWordLevel: false,
                                duration: 500
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('解析JSON格式失败:', line, error);
            }
            return;
        }

        // 处理逐字歌词格式: [时间,时长](时间,时长,0)词1(时间,时长,0)词2...
        // 每对[]表示一句歌词
        let sentenceMatches = [...line.matchAll(/\[(\d+),(\d+)\]/g)];

        sentenceMatches.forEach((match, index) => {
            let lineStartTime = parseInt(match[1]);
            let lineTotalDuration = parseInt(match[2]);

            // 获取当前这句歌词的内容 (从方括号后到下一个方括号或行末)
            let sentenceStart = match.index + match[0].length;
            let sentenceEnd = index < sentenceMatches.length - 1 ?
            sentenceMatches[index + 1].index : line.length;
            let sentenceContent = line.substring(sentenceStart, sentenceEnd);

            console.log(`解析句子 ${index + 1}: 时间=${lineStartTime}, 内容="${sentenceContent}"`);

            // 解析句子中的每个词: (时间,时长,0)词
            let wordTimePattern = /\(([^)]+)\)\s*([^()]*?)(?=\s*\([^)]+\)|$)/g;
            let wordMatch;

            while ((wordMatch = wordTimePattern.exec(sentenceContent)) !== null) {
                let timeInfo = wordMatch[1].split(',');
                let wordText = wordMatch[2].trim();

                // 处理空格转义，如果歌词中有转义空格
                wordText = wordText.replace(/\\s/g, ' ');

                if (timeInfo.length >= 2 && wordText) {
                    let wordStartTime = parseInt(timeInfo[0]);
                    let wordDuration = parseInt(timeInfo[1]);

                    parsedLyrics.push({
                        time: wordStartTime,
                        text: wordText,
                        translate: '',
                        isWordLevel: true,
                        duration: wordDuration,
                        lineStartTime: lineStartTime,
                        lineTotalDuration: lineTotalDuration
                    });
                }
            }
        });
    });

    // 按时间排序
    parsedLyrics.sort((a, b) => a.time - b.time);

    return parsedLyrics;
}

// 解析歌词 (兼容行尾带括号翻译的新格式)
function parseLyrics(lyrics) {
    // 处理空歌词情况
    if (!lyrics || lyrics.trim() === '') {
        return [];
    }

    // 规范化歌词中的换行符
    lyrics = lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // 将00:00:00格式的第二个冒号替换为点，变为00:00.00格式
    lyrics = lyrics.replace(/(\d+):(\d+):(\d+)/g, '$1:$2.$3');
    let parsedLyrics = [];
    let lyricLines = lyrics.split('\n');

    // 增强的正则表达式，匹配 [时:分:秒.毫秒]、[分:秒.毫秒] 或 [分:秒] 格式
    let timeRegex = /^\[(?:(\d+):)?(\d+):(\d+)(?:\.(\d{1,3}))?\]/;

    lyricLines.forEach((line, index) => {
        try {
            let match = timeRegex.exec(line);
            if (match) {
                let hours = match[1] ? parseInt(match[1]) : 0;
                let minutes = parseInt(match[2]);
                let seconds = parseInt(match[3]);
                let milliseconds = match[4] ? parseInt(match[4].padEnd(3, '0')) : 0;
                let timeMs = hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000 + milliseconds;
                
                let text = line.replace(timeRegex, '').trim();
                let translate = '';

                // 解析行尾的括号翻译，匹配如: 
                // "Don’t stop it (不要停下来)" 
                // "Can’t stop it (Yeah) (不能停下来（耶）)"
                // 允许中英文括号
                let transMatch = text.match(/^(.*?)\s+[\(（](.*)[\)）]$/);
                if (transMatch) {
                    text = transMatch[1].trim(); // 前半部分为原文
                    translate = transMatch[2].trim(); // 括号内为翻译
                }

                if (text || translate) {
                    parsedLyrics.push({
                        time: timeMs,
                        text: text || ' ', // 确保文本不为空
                        translate: translate
                    });
                }
            } else {
                // 处理没有时间戳的特殊行 (比如基础的介绍信息如果换行了)
                if (parsedLyrics.length > 0) {
                    let lastLyric = parsedLyrics[parsedLyrics.length - 1];
                    lastLyric.text += '\n' + line.trim();
                }
            }
        } catch (error) {
            console.error(`第${index}行: 解析歌词行失败:`, line, error);
        }
    });

    // 按时间排序
    parsedLyrics.sort((a, b) => a.time - b.time);
    return parsedLyrics;
}

class NekoPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentSongId = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.isShuffle = false;
        this.repeatMode = 2;
        this.shuffleHistory = []; // 用于记录随机播放历史，避免短时间内重复
        this.isVipUrl = false;
        this.wordLevelLyrics = []; // 逐字歌词数据
        this.translationMap = new Map(); // 逐字歌词行的翻译映射
        this.likedSongIds = new Set();
        this.hasFetchedLikelist = false;
        this.currentLikeCount = 0; // 当前歌曲红心数量
        this.audioContext = null;
        this.sourceNode = null; // MediaElementSource
        this.bassBoostFilters = null;
        this.isBassBoostEnabled = localStorage.getItem('bass-boost-enabled') === 'false';
        const savedRate = localStorage.getItem('playback-rate');
        this.audio.playbackRate = savedRate ? parseFloat(savedRate) : 1.0;

        this.initElements();
        this.bindEvents();
        this.loadFromUrl();
    }

    initElements() {
        // DOM Elements
        this.elements = {
            albumCover: document.getElementById('album-cover'),
            songName: document.getElementById('song-name'),
            songArtist: document.getElementById('song-artist'),
            totalTime: document.getElementById('total-time'),
            currentTime: document.getElementById('current-time'),
            progressBar: document.getElementById('progress-bar'),
            progressFilled: document.getElementById('progress-filled'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            shuffleBtn: document.getElementById('shuffle-btn'),
            repeatBtn: document.getElementById('repeat-btn'),
            volumeBtn: document.getElementById('volume-btn'),
            volumeSlider: document.getElementById('volume-slider'),
            lyricsContainer: document.getElementById('lyrics-container'),
            lyricsContent: document.getElementById('lyrics-content'),
        };
        this.elements.playbackRateSelect = document.getElementById('playback-rate');

        // 新增：播放列表对话框相关元素
        this.playlistDialog = null; // MDUI Dialog 实例
        this.elements.playlistBtn = document.getElementById('playlist-btn');
        this.elements.playlistContent = document.getElementById('playlist-content');

        // State
        this.isPlaying = false;
        this.lyrics = [];
        this.userIsScrolling = false;
        this.scrollTimeout = null;
    }

    bindEvents() {
        // Audio Events
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());

        // UI Events
        this.elements.playlistBtn.addEventListener('click', () => this.openPlaylist());
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.prevBtn.addEventListener('click', () => this.playPrev());
        this.elements.nextBtn.addEventListener('click', () => this.playNext());
        this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.elements.progressBar.addEventListener('click', (e) => this.seek(e));
        this.elements.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        document.getElementById('likeBtn').addEventListener('click', () => this.toggleLike());

        if (this.elements.playbackRateSelect) {
            this.elements.playbackRateSelect.addEventListener('change', () => this.changePlaybackRate());
            // 初始化下拉框选中状态
            this.elements.playbackRateSelect.value = this.audio.playbackRate.toString();
        }

        const bassBtn = document.getElementById('bass-boost-btn');
        if (bassBtn) {
            bassBtn.addEventListener('click', () => this.toggleBassBoost());
        }

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            // 切换到下一首
            this.playNext()
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            // 切换到上一首
            this.playPrev()
        });

        // Lyrics Scroll
        this.elements.lyricsContainer.addEventListener('scroll', () => this.onLyricsScroll());
    }

    // 获取歌曲红心数量
    async fetchLikeCount(songId) {
        try {
            const res = await fetch(`https://163api.ciallo.uk/song/red/count?id=${songId}`);
            const data = await res.json();
            if (data.code === 200) {
                this.currentLikeCount = `${data.data.countDesc}（${data.data.count}）` || 2778;
                this.updateLikeCountDisplay();
            } else {
                this.currentLikeCount = 0;
                this.updateLikeCountDisplay();
            }
        } catch (error) {
            console.error('获取红心数量失败:', error);
            this.currentLikeCount = 0;
            this.updateLikeCountDisplay();
        }
    }

    // 更新红心数量显示（HTML）
    updateLikeCountDisplay() {
        const el = document.getElementById('likeCount');
        if (el) {
            el.textContent = this.currentLikeCount.toLocaleString() + ' 人喜欢';
        }
    }

    changePlaybackRate() {
        const newRate = parseFloat(this.elements.playbackRateSelect.value);
        this.audio.playbackRate = newRate;
        localStorage.setItem('playback-rate', newRate.toString());
        mdui.snackbar({ message: `播放速度已设置为 ${newRate}x` });
    }

    createBassBoostChain(audioContext) {
        // 1. 极低频增强（Low Shelf）
        const lowshelf = audioContext.createBiquadFilter();
        lowshelf.type = 'lowshelf';
        lowshelf.frequency.value = 60;
        lowshelf.gain.value = 10;

        // 2. 低频增强（Peaking）
        const peaking1 = audioContext.createBiquadFilter();
        peaking1.type = 'peaking';
        peaking1.frequency.value = 120;
        peaking1.gain.value = 6;
        peaking1.Q.value = 0.8;

        // 3. 中低频增强（Peaking）
        const peaking2 = audioContext.createBiquadFilter();
        peaking2.type = 'peaking';
        peaking2.frequency.value = 250;
        peaking2.gain.value = 4;
        peaking2.Q.value = 0.5;

        // 4. 动态压缩器（防失真）
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 4;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.2;

        // 5. 高频衰减（High Shelf，减少干扰）
        const highshelf = audioContext.createBiquadFilter();
        highshelf.type = 'highshelf';
        highshelf.frequency.value = 200;
        highshelf.gain.value = -3;

        return [lowshelf, peaking1, peaking2, highshelf, compressor];
    }

    openPlaylist() {
        if (!this.playlistDialog) {
            // 首次点击时初始化 MDUI Dialog
            this.playlistDialog = new mdui.Dialog('#playlist-dialog');
        }
        this.renderPlaylist(); // 确保列表是最新的
        this.playlistDialog.open();
    }

    renderPlaylist() {
        if (this.playlist.length === 0) {
            this.elements.playlistContent.innerHTML = '<p class="mdui-center mdui-m-t-4">播放列表为空</p>';
            return;
        }

        let html = '';
        this.playlist.forEach((song, index) => {
            const isActive = index === this.currentIndex;
            // 兼容新旧格式的歌手名解析
            let artist = song.artist || (song.ar ? song.ar.map(a => a.name).join(' / ') : '未知歌手');
            
            html += `
            <div class="mdui-list-item ${isActive ? 'mdui-list-item-active' : ''}" data-index="${index}">
            <div class="mdui-list-item-content">
            <div class="mdui-list-item-title">${song.name}</div>
            <div class="mdui-list-item-text mdui-text-color-theme-disabled">
            ${artist}
            </div>
            </div>
            </div>
            `;
        });
        this.elements.playlistContent.innerHTML = html;

        // 为每个列表项绑定点击事件
        this.elements.playlistContent.querySelectorAll('.mdui-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.playSong(index);
                if (this.playlistDialog) {
                    this.playlistDialog.close();
                }
            });
        });
    }

    // --- Core Playback Logic ---
    async loadSong(songId) {
        try {
            this.currentSongId = songId;
            const data = await getSongDetail(songId);
            if (!data.songs || data.songs.length === 0) throw new Error('Song not found');

            const song = data.songs[0];
            this.renderSongInfo(song);

            // Load URL
            const urlData = await getSongUrl(songId);
            if (isVipUrl) {
                this.audio.src = urlData[0].url;
                // 初始化或重建 Web Audio 链（用于 Bass Boost）
                this.setupAudioGraph();
            } else {
                this.audio.src = urlData.data[0].url;
                this.setupAudioGraph();
            }

            try {
                const lyricsText = await getLyrics(songId);
                // 新 API 已经是纯文本，所以直接传给 parseLyrics，翻译为空字符串即可
                this.lyrics = parseLyrics(lyricsText || '', '');
            } catch (e) {
                console.error('获取歌词失败:', e);
                this.lyrics = [];
            }
            
            // Load Lyrics
            // const lyricsData = await getLyrics(songId);
            // const original = lyricsData.lrc?.lyric || '';
            // const translate = lyricsData.tlyric?.lyric || '';
            // this.lyrics = parseLyrics(original, translate);

            // 尝试加载逐字歌词
            try {
                const newLyricsData = await getLyricsNew(songId);
                if (newLyricsData.yrc && newLyricsData.yrc.lyric) {
                    // 使用新的解析函数同时获取逐字歌词和翻译歌词
                    const parsedData = parseLyricsWithTranslation(newLyricsData);
                    this.wordLevelLyrics = parsedData.wordLevelLyrics;
                    this.translationMap = parsedData.translationMap;
                    console.log('逐字歌词加载成功，共', this.wordLevelLyrics.length, '个条目');
                    console.log('翻译歌词映射加载成功，映射了', this.translationMap.size, '行翻译');
                } else {
                    this.wordLevelLyrics = [];
                    this.translationMap = new Map();
                }
            } catch (error) {
                console.log('逐字歌词加载失败，使用普通歌词:', error);
                this.wordLevelLyrics = [];
                this.translationMap = new Map();
            }

            this.renderLyrics();
            await this.updateLikeButtonAndCount(songId);

            // Init Comment System (from comment.js)
            if (typeof initCommentSystem === 'function') {
                initCommentSystem(songId);
            }

        } catch (error) {
            console.error('Failed to load song:', error);
            mdui.snackbar({ message: '加载歌曲失败' });
        }
    }

    setupAudioGraph() {
        // 1. 全局只初始化一次 AudioContext 和 SourceNode
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // 核心修复点：SourceNode 只能对同一个 audio 元素创建一次
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.masterGain = this.audioContext.createGain();
        }

        // 应对浏览器的自动播放限制，确保上下文处于运行状态
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // 2. 先断开所有已有的连接，准备重新布线
        this.sourceNode.disconnect();
        if (this.bassBoostFilters && this.bassBoostFilters.length > 0) {
            this.bassBoostFilters.forEach(filter => filter.disconnect());
        }
        this.masterGain.disconnect();

        // 3. 重新建立连接逻辑
        let currentNode = this.sourceNode;

        if (this.isBassBoostEnabled) {
            // 如果还没创建过滤波器，就创建一次
            if (!this.bassBoostFilters) {
                this.bassBoostFilters = this.createBassBoostChain(this.audioContext);
            }
            
            // 将音频流依次穿过所有的低音滤波器
            this.bassBoostFilters.forEach(filter => {
                currentNode.connect(filter);
                currentNode = filter; // 指针后移
            });
        }

        // 4. 最终连到 master gain → destination (扬声器)
        currentNode.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
    }

    toggleBassBoost() {
        this.isBassBoostEnabled = !this.isBassBoostEnabled;
        localStorage.setItem('bass-boost-enabled', this.isBassBoostEnabled.toString());

        // 重建音频图（最简单可靠的方式）
        if (this.audio.src) {
            this.setupAudioGraph();
        }

        // 提示
        mdui.snackbar({
            message: this.isBassBoostEnabled ? '超重低音已开启' : '超重低音已关闭'
        });

        // 更新按钮样式
        const btn = document.getElementById('bass-boost-btn');
        if (btn) {
            btn.classList.toggle('mdui-text-color-theme', this.isBassBoostEnabled);
        }
    }

    async updateLikeButtonAndCount(songId) {
        // 并行请求：喜欢列表（如未加载） + 红心数量
        await Promise.all([
            this.fetchLikelistIfNeeded(),
            this.fetchLikeCount(songId)
        ]);

        // 更新按钮状态
        const isLiked = this.likedSongIds.has(songId.toString());
        this.setLikeButtonState(isLiked);
    }

    async toggleLike() {
        if (!this.currentSongId) return;

        const songId = this.currentSongId.toString();
        const wasLiked = this.likedSongIds.has(songId);
        const newLikeState = !wasLiked;

        this.setLikeButtonState(newLikeState);

        try {
            const res = await fetchWithCookie(`/like?id=${songId}&like=${newLikeState}`);
            const result = await res.json();

            if (result.code === 200) {
                if (newLikeState) {
                    this.likedSongIds.add(songId);
                    mdui.snackbar({ message: '操作成功' });
                } else {
                    this.likedSongIds.delete(songId);
                    mdui.snackbar({ message: '操作成功' });
                }
                // 重新获取红心数（最准确）
                await this.fetchLikeCount(songId);
            } else {
                this.setLikeButtonState(wasLiked);
                mdui.snackbar({ message: '操作失败，请登录后重试' });
            }
        } catch (error) {
            console.error('喜欢操作失败:', error);
            this.setLikeButtonState(wasLiked);
            mdui.snackbar({ message: '网络错误' });
        }
    }

    async fetchLikelistIfNeeded() {
        if (this.hasFetchedLikelist) return;

        try {
            const uid = await getLoginUid(); // ← 使用新函数
            if (!uid) {
                console.log('未登录，跳过 likelist 请求');
                return;
            }

            const res = await fetchWithCookie(`/likelist?uid=${uid}`);
            const data = await res.json();

            if (data.code === 200 && Array.isArray(data.ids)) {
                this.likedSongIds = new Set(data.ids.map(id => id.toString()));
                this.hasFetchedLikelist = true;
                console.log('喜欢列表加载成功，共', this.likedSongIds.size, '首');
            }
        } catch (error) {
            console.error('获取喜欢列表失败:', error);
        }
    }

    async loadPlaylist(playlistId) {
        try {
            const data = await getPlaylistTracks(playlistId);
            // 新API直接返回数组
            let songs = Array.isArray(data) ? data : (data.songs || []);
            if (songs.length === 0) throw new Error('Playlist is empty');
            
            // 为新 API 手动补充从 url 提取到的 ID
            this.playlist = songs.map(song => {
                if (!song.id && song.url) {
                    let match = song.url.match(/id=(\d+)/);
                    if (match) song.id = match[1];
                }
                return song;
            });
            
            this.updateControls();
            const params = getUrlParams();
            if (params.songId) {
                const idx = this.playlist.findIndex(s => s.id.toString() === params.songId);
                this.currentIndex = idx !== -1 ? idx : 0;
            } else {
                this.currentIndex = 0;
            }
            await this.loadSong(this.playlist[this.currentIndex].id);
            if (this.playlistDialog && this.playlistDialog.isOpen()) {
                this.renderPlaylist();
            }
        } catch (error) {
            console.error('Failed to load playlist:', error);
            mdui.snackbar({ message: '加载歌单失败' });
        }
    }

    async loadArtist(artistId) {
        try {
            const data = await getArtistSongs(artistId);
            if (!data.songs || data.songs.length === 0) throw new Error('No songs found for artist');
            this.playlist = data.songs;
            this.currentIndex = 0;
            this.updateControls();
            await this.loadSong(this.playlist[this.currentIndex].id);
            if (this.playlistDialog && this.playlistDialog.isOpen()) {
                this.renderPlaylist();
            }
        } catch (error) {
            console.error('Failed to load artist songs:', error);
            mdui.snackbar({ message: '加载歌手歌曲失败' });
        }
    }

    // 批量加载歌曲详情（根据 ID 列表）
    async loadSongsByIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('Invalid ids array');
        }

        try {
            // 调用网易云 API 获取每首歌的详情（假设你已有 getSongDetail 函数）
            const promises = ids.map(id => getSongDetail(id));
            const results = await Promise.allSettled(promises);

            // 过滤成功的结果，并提取歌曲
            const validSongs = results
            .map((result, index) => {
                if (result.status === 'fulfilled' && result.value?.songs?.[0]) {
                    return result.value.songs[0];
                } else {
                    console.warn(`Failed to load song with id: ${ids[index]}`, result.reason);
                    return null;
                }
            })
            .filter(song => song !== null);

            if (validSongs.length === 0) {
                throw new Error('No valid songs loaded from ids');
            }

            // 设置播放列表
            this.playlist = validSongs;
            this.currentIndex = 0;
            this.updateControls(); // 更新 UI 控件（如歌曲名、封面等）

            // 加载第一首
            await this.loadSong(validSongs[0].id);
        } catch (error) {
            console.error('Error in loadSongsByIds:', error);
            mdui.snackbar({ message: '加载指定歌曲失败，请检查ID是否有效' });
        }
    }

    async loadFromUrl() {
        const { songId, playlistId, artistId, mode, ids } = getUrlParams();

        if (mode === 'intelligence' && playlistId && songId) {
            this.loadIntelligenceMode(songId, playlistId);
        } else if (playlistId) {
            this.loadPlaylist(playlistId);
        } else if (artistId) {
            this.loadArtist(artistId);
        }else if (ids && ids.length > 0) {
            // 直接通过多个 ID 播放
            let finalIds = [...ids]; // 复制一份

            if (songId) {
                const songIdStr = songId.toString();
                // 检查 songId 是否在 ids 中
                const indexInIds = finalIds.findIndex(id => id.toString() === songIdStr);
                if (indexInIds !== -1) {
                    // 如果在，移到最前面
                    finalIds.splice(indexInIds, 1);
                    finalIds.unshift(songIdStr);
                } else {
                    // 如果不在，也加到最前面（可选行为，根据需求）
                    finalIds.unshift(songIdStr);
                }
            }
            await this.loadSongsByIds(finalIds);
        } else if (songId) {
            this.loadSong(songId);
        } else {
            this.loadSong('1915551846');
        }
    }

    async playSong(index) {
        if (index < 0 || index >= this.playlist.length) return;
        this.currentIndex = index;
        await this.loadSong(this.playlist[index].id);
        this.audio.play().catch(e => console.error('Play failed:', e));
        if (this.playlistDialog && this.playlistDialog.isOpen()) {
            this.renderPlaylist(); // 简单粗暴地重新渲染
        }
    }

    playPrev() {
        if (this.playlist.length <= 1) return;

        let newIndex;
        if (this.isShuffle && this.shuffleHistory.length > 0) {
            // Go back in history
            newIndex = this.shuffleHistory.pop();
        } else {
            newIndex = this.currentIndex - 1;
            if (newIndex < 0) newIndex = this.playlist.length - 1;
        }
        this.playSong(newIndex);
    }

    playNext() {
        if (this.playlist.length <= 1) return;

        let newIndex;
        if (this.isShuffle) {
            // Generate a new random index that's not the current one
            // And not in recent history (simple approach)
            const availableIndices = this.playlist
            .map((_, i) => i)
            .filter(i => i !== this.currentIndex && !this.shuffleHistory.includes(i));

            if (availableIndices.length === 0) {
                // If all are played, reset history
                this.shuffleHistory = [this.currentIndex];
                availableIndices = this.playlist.map((_, i) => i).filter(i => i !== this.currentIndex);
            }

            newIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            this.shuffleHistory.push(this.currentIndex); // Add current to history
            // Keep history size reasonable
            if (this.shuffleHistory.length > Math.min(10, this.playlist.length - 1)) {
                this.shuffleHistory.shift();
            }
        } else {
            newIndex = this.currentIndex + 1;
            if (newIndex >= this.playlist.length) newIndex = 0;
        }
        this.playSong(newIndex);
    }

    togglePlayPause() {
        if (this.audio.paused) {
            this.audio.play().catch(e => console.error('Play failed:', e));
        } else {
            this.audio.pause();
        }
    }

    onPlay() {
        this.isPlaying = true;
        this.elements.playPauseBtn.innerHTML = '<i class="mdui-icon material-icons">pause</i>';
    }

    onPause() {
        this.isPlaying = false;
        this.elements.playPauseBtn.innerHTML = '<i class="mdui-icon material-icons">play_arrow</i>';
    }

    onEnded() {
        if (this.repeatMode === 1) {
            this.audio.currentTime = 0;
            this.audio.play();
        } else if (this.repeatMode === 2 || this.isShuffle) {
            this.playNext();
        } else {
            this.onPause(); // Ensure UI is updated
        }
    }

    // --- UI Update Methods ---
    renderSongInfo(song) {
        document.title = `${song.name} - NekoMusic`;
        this.elements.songName.textContent = song.name;
        
        let artist = song.artist || (song.ar ? song.ar.map(a => a.name).join(' / ') : '未知歌手');
        this.elements.songArtist.textContent = artist;
        
        let pic = song.pic || (song.al ? `${song.al.picUrl}?param=400x400` : '');
        this.elements.albumCover.src = pic;
        
        this.elements.totalTime.textContent = song.dt ? formatDuration(song.dt) : '00:00';

        const backgroundOverlay = document.getElementById('background-overlay');
        if (backgroundOverlay) {
            backgroundOverlay.style.backgroundImage = `url(${pic})`;
        }

        // 设置 Media Session API 的 Metadata
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name,
                artist: artist,
                album: song.al ? song.al.name : '', 
                artwork: [
                    { src: pic, sizes: '256x256', type: 'image/jpeg' },
                    { src: pic, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }
    }

    renderLyrics() {
        this.elements.lyricsContent.innerHTML = '';
        if (this.lyrics.length === 0 && (!this.wordLevelLyrics || this.wordLevelLyrics.length === 0)) {
            this.elements.lyricsContent.innerHTML = '<p class="lyrics-line">暂无歌词</p>';
            return;
        }

        // 如果有逐字歌词，使用特殊渲染方式
        if (this.wordLevelLyrics && this.wordLevelLyrics.length > 0) {
            this.renderWordLevelLyrics();
        } else {
            // 使用普通歌词渲染方式
            this.lyrics.forEach(lyric => {
                const lineEl = document.createElement('div');
                lineEl.className = 'lyrics-line';
                lineEl.dataset.time = lyric.time;

                const originalEl = document.createElement('div');
                originalEl.className = 'lyrics-original';
                originalEl.textContent = lyric.text;
                lineEl.appendChild(originalEl);

                if (lyric.translate) {
                    const translateEl = document.createElement('div');
                    translateEl.className = 'lyrics-translate';
                    translateEl.textContent = lyric.translate;
                    lineEl.appendChild(translateEl);
                }

                this.elements.lyricsContent.appendChild(lineEl);
            });
        }

        // Add padding divs for better scrolling at ends
        for (let i = 0; i < 10; i++) {
            const pad = document.createElement('div');
            pad.style.height = '2rem';
            this.elements.lyricsContent.appendChild(pad);
        }
    }

    renderWordLevelLyrics() {
        // 将逐字歌词按行分组
        let lineGroups = [];
        let currentLine = [];
        let currentLineStartTime = null;

        this.wordLevelLyrics.forEach(word => {
            if (currentLine.length > 0 && word.lineStartTime !== currentLineStartTime) {
                lineGroups.push(currentLine);
                currentLine = [];
                currentLineStartTime = word.lineStartTime;
            }
            currentLine.push(word);
            if (currentLineStartTime === null) {
                currentLineStartTime = word.lineStartTime;
            }
        });

        // 添加最后一行
        if (currentLine.length > 0) {
            lineGroups.push(currentLine);
        }

        lineGroups.forEach(lineWords => {
            const lineEl = document.createElement('div');
            lineEl.className = 'lyrics-line';
            lineEl.dataset.time = lineWords[0].time;
            lineEl.dataset.lineStartTime = lineWords[0].lineStartTime;

            const originalEl = document.createElement('div');
            originalEl.className = 'lyrics-original';

            // 为每个词创建span
            lineWords.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'lyrics-word';
                wordSpan.textContent = word.text;
                wordSpan.dataset.time = word.time;
                wordSpan.dataset.duration = word.duration || 0;
                originalEl.appendChild(wordSpan);

                // 仅在英文单词后添加空格，但最后一个词不添加
                if (index < lineWords.length - 1) {
                    // 更智能的空格判断：检查是否是英文单词
                    if (/[a-zA-Z]/.test(word.text) || /[a-zA-Z]/.test(lineWords[index + 1]?.text)) {
                        originalEl.appendChild(document.createTextNode(' '));
                    }
                }
            });

            lineEl.appendChild(originalEl);

            // 检查是否有对应的翻译
            const lineStartTime = lineWords[0].lineStartTime;
            if (this.translationMap.has(lineStartTime)) {
                const translationEl = document.createElement('div');
                translationEl.className = 'lyrics-translate';
                translationEl.dataset.lineStartTime = lineStartTime;
                translationEl.textContent = this.translationMap.get(lineStartTime);
                lineEl.appendChild(translationEl);
            }

            this.elements.lyricsContent.appendChild(lineEl);
        });
    }

    updateProgress() {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.elements.progressFilled.style.width = `${percent}%`;
        this.elements.currentTime.textContent = formatDuration(this.audio.currentTime * 1000);
    }

    onTimeUpdate() {
        this.updateProgress();
        this.updateActiveLyric();
    }

    updateActiveLyric() {
        if (this.userIsScrolling) return;

        const currentTimeMs = this.audio.currentTime * 1000;

        // 如果有逐字歌词，使用逐字高亮
        if (this.wordLevelLyrics && this.wordLevelLyrics.length > 0) {
            this.updateWordLevelHighlight(currentTimeMs);
        } else if (this.lyrics.length > 0) {
            // 使用普通的行级高亮
            this.updateLineLevelHighlight(currentTimeMs);
        }
    }

    updateWordLevelHighlight(currentTimeMs) {
        // 找到当前应该高亮的行和词
        let currentLine = null;
        let currentLineTime = 0;

        // 按行分组逐字歌词，找到当前行
        for (let i = 0; i < this.wordLevelLyrics.length; i++) {
            const word = this.wordLevelLyrics[i];
            if (word.lineStartTime !== currentLineTime) {
                if (word.lineStartTime > currentTimeMs) break;
                currentLineTime = word.lineStartTime;
                currentLine = word.lineStartTime;
            }
        }

        // 清除所有高亮和行放大（重新设计逻辑）
        this.elements.lyricsContent.querySelectorAll('.lyrics-word').forEach(el => {
            el.classList.remove('active');
            el.classList.remove('mdui-text-color-theme');
        });
        this.elements.lyricsContent.querySelectorAll('.lyrics-line').forEach(el => {
            el.classList.remove('active');
        });
        // this.elements.lyricsContent.querySelectorAll('.lyrics-translate').forEach(el => {
        //     el.classList.remove('current-translation');
        // });

        // 高亮当前行中所有已读过的词
        let hasActiveWord = false;
        let activeLineElements = null;

        this.elements.lyricsContent.querySelectorAll('.lyrics-line').forEach(lineEl => {
            const lineTime = parseInt(lineEl.dataset.time);

            // 如果是当前行，则高亮该行中所有已读过的词，并放大该行
            if (currentLine && lineTime === currentLine) {
                activeLineElements = lineEl;
                lineEl.classList.add('active'); // 添加当前行放大效果

                // 高亮翻译
                // const translationEl = lineEl.querySelector('.lyrics-translate');
                // if (translationEl) {
                //     translationEl.classList.add('current-translation');
                // }

                lineEl.querySelectorAll('.lyrics-word').forEach(wordEl => {
                    const wordTime = parseInt(wordEl.dataset.time);

                    // 如果这个词的时间已经到达，则高亮它
                    if (wordTime <= currentTimeMs) {
                        wordEl.classList.add('active');
                        wordEl.classList.add('mdui-text-color-theme');
                        hasActiveWord = true;
                    }
                });
            }
        });

        // 滚动到当前行
        if (activeLineElements && hasActiveWord) {
            this.scrollToLyric(activeLineElements);
        }
    }

    updateLineLevelHighlight(currentTimeMs) {
        let activeLine = null;
        let closestLine = this.lyrics[0];

        // Find the active line (last line whose time <= currentTime)
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i].time <= currentTimeMs) {
                activeLine = this.elements.lyricsContent.children[i];
                closestLine = this.lyrics[i];
            } else {
                break;
            }
        }

        // Remove active class from all
        this.elements.lyricsContent.querySelectorAll('.lyrics-line').forEach(el => {
            el.classList.remove('active');
        });

        if (activeLine) {
            activeLine.classList.add('active');
            this.scrollToLyric(activeLine);
        }
    }

    scrollToLyric(lineEl) {
        const container = this.elements.lyricsContainer;
        const containerRect = container.getBoundingClientRect();
        const lineRect = lineEl.getBoundingClientRect();

        // Calculate the scroll position to center the line
        const scrollTop = lineEl.offsetTop - (containerRect.height / 2) + (lineRect.height / 2);

        // Use smooth behavior for native smooth scrolling
        container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }

    onLyricsScroll() {
        this.userIsScrolling = true;
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.userIsScrolling = false;
            if (this.isPlaying) {
                this.updateActiveLyric(); // Re-sync after user stops scrolling
            }
        }, 200);
    }

    async loadIntelligenceMode(songId, playlistId) {
        try {
            const data = await getPlaylistIntelligence(songId, playlistId);

            // 检查返回结构是否有效
            if (!data || !data.data || typeof data.data !== 'object') {
                throw new Error('心动模式返回数据格式无效');
            }

            // 将 { "0": { songInfo: {...} }, "1": ... } 转为数组
            const trackEntries = Object.values(data.data);
            this.playlist = trackEntries.map(item => {
                const info = item.songInfo;
                return {
                    id: info.id,
                    name: info.name,
                    ar: info.ar || [{ name: '未知歌手' }],
                    al: info.al || { picUrl: '' },
                    dt: info.dt || 0,
                    // 如果需要其他字段（如 mv、privilege），也可在此补充
                };
            });

            if (this.playlist.length === 0) {
                throw new Error('心动模式未返回任何歌曲');
            }

            // 查找起始歌曲位置（通常第一首就是传入的 songId）
            const startIndex = this.playlist.findIndex(s => s.id.toString() === songId.toString());
            this.currentIndex = startIndex >= 0 ? startIndex : 0;

            this.updateControls();
            await this.loadSong(this.playlist[this.currentIndex].id);

            if (this.playlistDialog && this.playlistDialog.isOpen()) {
                this.renderPlaylist();
            }
        } catch (error) {
            console.error('加载心动模式失败:', error);
            mdui.snackbar({ message: '加载心动模式失败，请确保已登录并拥有该歌单权限' });
        }
    }

    // 更新喜欢按钮图标
    setLikeButtonState(liked) {
        const btn = document.getElementById('likeBtn');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (liked) {
            icon.textContent = 'favorite';
            icon.style.color = '#f44336'; // 红色表示已喜欢
        } else {
            icon.textContent = 'favorite_border';
            icon.style.color = ''; // 恢复默认
        }
    }

    seek(e) {
        const rect = this.elements.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        this.audio.currentTime = percentage * this.audio.duration;
    }

    setVolume(value) {
        this.audio.volume = value;
        this.updateVolumeIcon();
    }

    toggleMute() {
        if (this.audio.volume === 0) {
            this.audio.volume = this.previousVolume || 0.8;
        } else {
            this.previousVolume = this.audio.volume;
            this.audio.volume = 0;
        }
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const vol = this.audio.volume;
        let icon = 'volume_up';
        if (vol === 0) icon = 'volume_off';
        else if (vol < 0.5) icon = 'volume_down';
        this.elements.volumeBtn.innerHTML = `<i class="mdui-icon material-icons">${icon}</i>`;
        this.elements.volumeSlider.value = vol * 100;
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.elements.shuffleBtn.classList.toggle('active', this.isShuffle);
        this.updateControls();
        mdui.snackbar({ message: this.isShuffle ? '已开启随机播放' : '已关闭随机播放' });
    }

    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        let icon = 'repeat';
        let message = '已设置为不循环';
        if (this.repeatMode === 1) {
            icon = 'repeat_one';
            message = '已设置为单曲循环';
        } else if (this.repeatMode === 2) {
            message = '已设置为列表循环';
        }
        this.elements.repeatBtn.innerHTML = `<i class="mdui-icon material-icons">${icon}</i>`;
        this.elements.repeatBtn.classList.toggle('active', this.repeatMode !== 0);
        mdui.snackbar({ message });
    }

    updateControls() {
        const hasList = this.playlist.length > 1;
        this.elements.prevBtn.disabled = !hasList;
        this.elements.nextBtn.disabled = !hasList;
    }

    onLoadedMetadata() {
        this.updateProgress();
        // 获取真实的歌曲总时长并替换原本的 00:00
        if (this.audio.duration && !isNaN(this.audio.duration)) {
            this.elements.totalTime.textContent = formatDuration(this.audio.duration * 1000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nekoPlayer = new NekoPlayer();
});
