let globalSongIds = [];

document.addEventListener('DOMContentLoaded', function() {
    // 获取API基础URL
    let apiBaseUrl = ThemeManager.getApiBaseUrl();
    globalSongIds = [];

    // 获取Banner
    fetchBanner();
    // 获取推荐歌单
    fetchPersonalized();
    // 获取新碟
    fetchAlbumNew();
    // 获取推荐新音乐
    fetchPersonalizedNewsong();
    // 获取推荐电台
    fetchPersonalizedDjprogram();

    // Banner滚动功能实现
    let banners = [];
    let currentBannerIndex = 0;
    let bannerInterval;
    let bannerDuration = 5000; // 5秒切换一次

    // 获取Banner函数
    function fetchBanner() {
        fetchWithCookie(`${apiBaseUrl}banner?type=0`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.banners && data.banners.length > 0) {
                    banners = data.banners;
                    initBannerSlider();
                    startBannerInterval();
                }
            })
            .catch(error => {
                console.error('获取Banner失败:', error);
            });
    }

    // 初始化Banner滑块
    function initBannerSlider() {
        let bannerWrapper = document.getElementById('bannerWrapper');
        let bannerIndicators = document.getElementById('bannerIndicators');

        // 清空内容
        bannerWrapper.innerHTML = '';
        bannerIndicators.innerHTML = '';

        // 创建Banner幻灯片
        banners.forEach((banner, index) => {
            let slide = document.createElement('div');
            slide.className = 'banner-slide';
            slide.style.backgroundImage = `url(${banner.imageUrl})`;
            slide.style.left = `${index * 100}%`;
            slide.onclick = function() {
                window.open(banner.url, '_blank');
            };
            bannerWrapper.appendChild(slide);

            // 创建指示器
            let indicator = document.createElement('div');
            indicator.className = `banner-indicator ${index === 0 ? 'active' : ''}`;
            indicator.onclick = function() {
                goToBanner(index);
            };
            bannerIndicators.appendChild(indicator);
        });

        // 添加左右箭头事件
        document.getElementById('prevBanner').onclick = prevBanner;
        document.getElementById('nextBanner').onclick = nextBanner;

        // 初始显示第一张
        goToBanner(0);
    }

    // 切换到指定Banner
    function goToBanner(index) {
        currentBannerIndex = index;
        let bannerWrapper = document.getElementById('bannerWrapper');
        bannerWrapper.style.transform = `translateX(-${currentBannerIndex * 100}%)`;

        // 更新指示器
        let indicators = document.querySelectorAll('.banner-indicator');
        indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === currentBannerIndex);
        });
    }

    // 上一张Banner
    function prevBanner() {
        currentBannerIndex = (currentBannerIndex - 1 + banners.length) % banners.length;
        goToBanner(currentBannerIndex);
    }

    // 下一张Banner
    function nextBanner() {
        currentBannerIndex = (currentBannerIndex + 1) % banners.length;
        goToBanner(currentBannerIndex);
    }

    // 开始自动切换
    function startBannerInterval() {
        bannerInterval = setInterval(nextBanner, bannerDuration);
        // 鼠标悬停时暂停自动切换
        document.querySelector('.banner-container').onmouseenter = function() {
            clearInterval(bannerInterval);
        };
        // 鼠标离开时恢复自动切换
        document.querySelector('.banner-container').onmouseleave = function() {
            startBannerInterval();
        };
    }

    // 获取推荐歌单函数
    function fetchPersonalized() {
        fetchWithCookie(`${apiBaseUrl}personalized`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.result && data.result.length > 0) {
                    let container = document.getElementById('personalizedContainer');
                    container.innerHTML = '';

                    // 最多显示6个歌单
                    let displayCount = Math.min(6, data.result.length);

                    for (let i = 0; i < displayCount; i++) {
                        let item = data.result[i];
                        let card = createMusicCard(item.name, item.picUrl, item.playCount, item.id, 'playlist');
                        container.appendChild(card);
                    }
                }
            })
            .catch(error => {
                console.error('获取推荐歌单失败:', error);
            });
    }

    // 获取新碟函数
    function fetchAlbumNew() {
        fetchWithCookie(`${apiBaseUrl}album/new`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.albums && data.albums.length > 0) {
                    let container = document.getElementById('albumNewContainer');
                    container.innerHTML = '';

                    // 最多显示6个专辑
                    let displayCount = Math.min(6, data.albums.length);

                    for (let i = 0; i < displayCount; i++) {
                        let item = data.albums[i];
                        // 格式化歌手名称
                        let artists = item.artists.map(artist => artist.name).join(' / ');
                        let card = createMusicCard(`${item.name} - ${artists}`, item.picUrl, null, item.id, 'album');
                        container.appendChild(card);
                    }
                }
            })
            .catch(error => {
                console.error('获取新碟失败:', error);
            });
    }

    // 获取推荐新音乐函数
    function fetchPersonalizedNewsong() {
        fetchWithCookie(`${apiBaseUrl}personalized/newsong`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.result && data.result.length > 0) {
                    let container = document.getElementById('personalizedNewsongContainer');
                    container.innerHTML = '';
                    let songIds = data.result.map(item => item.song.id);
                    globalSongIds = [...new Set([...globalSongIds, ...songIds])];

                    // 最多显示6首歌曲
                    let displayCount = Math.min(6, data.result.length);

                    for (let i = 0; i < displayCount; i++) {
                        let item = data.result[i];
                        let artists = item.song.artists.map(artist => artist.name).join(' / ');
                        let card = createMusicCard(
                            `${item.song.name} - ${artists}`,
                            item.song.album.picUrl,
                            null,
                            item.song.id,
                            'song',
                            true
                        );
                        container.appendChild(card);
                    }
                } else {
                    console.error('没有找到推荐新音乐数据');
                }
            })
            .catch(error => {
                console.error('获取推荐新音乐失败:', error);
            });
    }

    // 获取推荐电台函数
    function fetchPersonalizedDjprogram() {
        fetchWithCookie(`${apiBaseUrl}personalized/djprogram`)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.result && data.result.length > 0) {
                    let container = document.getElementById('personalizedDjprogramContainer');
                    container.innerHTML = '';

                    // 最多显示6个电台
                    let displayCount = Math.min(6, data.result.length);

                    for (let i = 0; i < displayCount; i++) {
                        let item = data.result[i];
                        let card = createMusicCard(item.name, item.picUrl, item.program.playCount, item.id, 'djprogram');
                        container.appendChild(card);
                    }
                }
            })
            .catch(error => {
                console.error('获取推荐电台失败:', error);
            });
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
});
