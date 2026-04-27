// 基础API URL
let apiBaseUrl = ThemeManager.getApiBaseUrl();
let artistId = null;
let isFollowing = false;
let currentTab = 'songs';
let allSongsOffset = 0;
let allSongsLimit = 100;
let allSongs = [];
let isLoading = false;
// MV分页变量
let mvsOffset = 0;
let mvsLimit = 20;
let mvs = [];
let hasMoreMvs = true;
// 专辑分页变量
let albumsOffset = 0;
let albumsLimit = 20;
let albums = [];
let hasMoreAlbums = true;

let loadMoreAlbumsBtn = null;
let loadMoreMvsBtn = null;

// DOM元素
let artistBg = document.getElementById('artistBg');
let artistAvatar = document.getElementById('artistAvatar');
let artistName = document.getElementById('artistName');
let artistAlias = document.getElementById('artistAlias');
let playBtn = document.getElementById('playBtn');
let followBtn = document.getElementById('followBtn');
let shareBtn = document.getElementById('shareBtn');
let musicCount = document.getElementById('musicCount');
let albumCount = document.getElementById('albumCount');
let mvCount = document.getElementById('mvCount');
let fanCount = document.getElementById('fanCount');
let songsListContainer = document.getElementById('songsListContainer');
let allSongsListContainer = document.getElementById('allSongsListContainer');
let loadMoreBtnContainer = document.getElementById('loadMoreBtnContainer');
let loadMoreBtn = document.getElementById('loadMoreBtn');
let albumsListContainer = document.getElementById('albumsListContainer');
let mvsListContainer = document.getElementById('mvsListContainer');
let artistDesc = document.getElementById('artistDesc');
let searchInput = document.getElementById('searchInput');
let searchIcon = document.getElementById('searchIcon');
let searchSuggestions = document.getElementById('searchSuggestions');
let tabLinks = document.querySelectorAll('.mdui-tab');
let tabContents = document.querySelectorAll('.section-content');

// 获取URL参数
function getUrlParams() {
    let params = new URLSearchParams(window.location.search);
    artistId = params.get('id');
    if (!artistId) {
        // 如果没有歌手ID，跳转到首页
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 获取歌手信息
function getArtistInfo() {
    fetchWithCookie(`${apiBaseUrl}artists?id=${artistId}`)
        .then(response => response.json())
        .then(data => {
            if (data.artist) {
                let artist = data.artist;
                // 设置歌手基本信息
                artistAvatar.src = artist.img1v1Url;
                artistBg.style.backgroundImage = `url(${artist.picUrl})`;
                artistName.textContent = artist.name;
                document.title = `${artist.name} - NekoMusic`;
                artistAlias.textContent = artist.alias.join(' / ') || '暂无别名';
                musicCount.textContent = `${artist.musicSize || 0} 首歌曲`;
                albumCount.textContent = `${artist.albumSize || 0} 张专辑`;
                mvCount.textContent = `${artist.mvSize || 0} 个MV`;

                // 渲染热门歌曲
                if (data.hotSongs && data.hotSongs.length > 0) {
                    renderHotSongs(data.hotSongs);
                } else {
                    showNoData(songsListContainer, '暂无热门歌曲');
                }
            } else {
                mdui.snackbar({ message: '获取歌手信息失败' });
            }
        })
        .catch(error => {
            console.error('获取歌手信息失败:', error);
            mdui.snackbar({ message: '获取歌手信息失败' });
        });
}

// 获取歌手详情
function getArtistDetail() {
    fetchWithCookie(`${apiBaseUrl}artist/detail?id=${artistId}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data && data.data.artist) {
                let artist = data.data.artist;
                // 更新歌手统计信息
                musicCount.textContent = `${artist.musicSize || 0} 首歌曲`;
                albumCount.textContent = `${artist.albumSize || 0} 张专辑`;
                mvCount.textContent = `${artist.mvSize || 0} 个MV`;
            }
        })
        .catch(error => {
            console.error('获取歌手详情失败:', error);
        });
}

// 获取歌手粉丝数量
function getArtistFanCount() {
    fetchWithCookie(`${apiBaseUrl}artist/follow/count?id=${artistId}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                fanCount.textContent = `${formatPlayCount(data.followCount || 0)} 粉丝`;
            }
        })
        .catch(error => {
            console.error('获取歌手粉丝数量失败:', error);
        });
}

// 获取歌手专辑
function getArtistAlbums() {
    if (isLoading || !hasMoreAlbums) return;
    isLoading = true;

    // 显示加载指示器
    let loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.innerHTML = '<div class="mdui-spinner mdui-spinner-colorful"></div>';
    albumsListContainer.appendChild(loadingIndicator);

    fetchWithCookie(`${apiBaseUrl}artist/album?id=${artistId}&limit=${albumsLimit}&offset=${albumsOffset}`)
        .then(response => response.json())
        .then(data => {
            // 移除加载指示器
            albumsListContainer.removeChild(loadingIndicator);
            isLoading = false;

            if (data.code === 200 && data.hotAlbums && data.hotAlbums.length > 0) {
                // 添加到专辑数组
                albums = [...albums, ...data.hotAlbums];
                // 渲染专辑
                if (albumsOffset === 0) {
                    renderAlbums(albums);
                } else {
                    appendAlbums(data.hotAlbums);
                }
                // 更新偏移量
                albumsOffset += data.hotAlbums.length;
                // 检查是否还有更多数据
                hasMoreAlbums = data.hotAlbums.length === albumsLimit;
                // 显示或隐藏加载更多按钮
                loadMoreAlbumsBtn.style.display = hasMoreAlbums ? 'block' : 'none';
            } else {
                if (albums.length === 0) {
                    showNoData(albumsListContainer, '暂无专辑');
                }
                hasMoreAlbums = false;
            }
        })
        .catch(error => {
            // 移除加载指示器
            albumsListContainer.removeChild(loadingIndicator);
            isLoading = false;
            console.error('获取歌手专辑失败:', error);
            if (albums.length === 0) {
                showNoData(albumsListContainer, '获取专辑失败');
            }
        });
}

// 追加专辑
function appendAlbums(newAlbums) {
    newAlbums.forEach(album => {
        let albumItem = document.createElement('div');
        albumItem.className = 'album-item';

        let albumCover = document.createElement('img');
        albumCover.className = 'album-cover';
        albumCover.src = album.picUrl;
        albumCover.alt = album.name;

        let albumInfo = document.createElement('div');
        albumInfo.className = 'album-info';

        let albumName = document.createElement('div');
        albumName.className = 'album-name';
        albumName.textContent = album.name;

        let albumArtist = document.createElement('div');
        albumArtist.className = 'album-artist';
        albumArtist.textContent = album.artist.name;

        let albumDate = document.createElement('div');
        albumDate.className = 'album-artist';
        albumDate.textContent = formatDate(album.publishTime);

        albumInfo.appendChild(albumName);
        albumInfo.appendChild(albumArtist);
        albumInfo.appendChild(albumDate);

        albumItem.appendChild(albumCover);
        albumItem.appendChild(albumInfo);

        // 点击事件 - 查看专辑
        albumItem.addEventListener('click', () => {
            window.location.href = `album.html?id=${album.id}`;
        });

        albumsListContainer.appendChild(albumItem);
    });
}

// 获取歌手MV
function getArtistMvs() {
    if (isLoading || !hasMoreMvs) return;
    isLoading = true;

    // 显示加载指示器
    let loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading';
    loadingIndicator.innerHTML = '<div class="mdui-spinner mdui-spinner-colorful"></div>';
    mvsListContainer.appendChild(loadingIndicator);

    fetchWithCookie(`${apiBaseUrl}artist/mv?id=${artistId}&limit=${mvsLimit}&offset=${mvsOffset}`)
        .then(response => response.json())
        .then(data => {
            // 移除加载指示器
            mvsListContainer.removeChild(loadingIndicator);
            isLoading = false;

            if (data.code === 200 && data.mvs && data.mvs.length > 0) {
                // 添加到MV数组
                mvs = [...mvs, ...data.mvs];
                // 渲染MV
                if (mvsOffset === 0) {
                    renderMvs(mvs);
                } else {
                    appendMvs(data.mvs);
                }
                // 更新偏移量
                mvsOffset += data.mvs.length;
                // 检查是否还有更多数据
                hasMoreMvs = data.mvs.length === mvsLimit;
                // 显示或隐藏加载更多按钮
                loadMoreMvsBtn.style.display = hasMoreMvs ? 'block' : 'none';
            } else {
                if (mvs.length === 0) {
                    showNoData(mvsListContainer, '暂无MV');
                }
                hasMoreMvs = false;
            }
        })
        .catch(error => {
            // 移除加载指示器
            mvsListContainer.removeChild(loadingIndicator);
            isLoading = false;
            console.error('获取歌手MV失败:', error);
            if (mvs.length === 0) {
                showNoData(mvsListContainer, '获取MV失败');
            }
        });
}

// 追加MV
function appendMvs(newMvs) {
    newMvs.forEach(mv => {
        let mvItem = document.createElement('div');
        mvItem.className = 'mv-item';

        let mvCover = document.createElement('img');
        mvCover.className = 'mv-cover';
        mvCover.src = mv.imgurl;
        mvCover.alt = mv.name;

        let mvDuration = document.createElement('div');
        mvDuration.className = 'mv-duration';
        mvDuration.textContent = formatDuration(mv.duration);

        let mvInfo = document.createElement('div');
        mvInfo.className = 'mv-info';

        let mvName = document.createElement('div');
        mvName.className = 'mv-name';
        mvName.textContent = mv.name;

        let mvArtist = document.createElement('div');
        mvArtist.className = 'mv-artist';
        mvArtist.textContent = mv.artistName;

        let mvPlayCount = document.createElement('div');
        mvPlayCount.className = 'mv-artist';
        mvPlayCount.textContent = `播放量: ${formatPlayCount(mv.playCount)}`;

        mvInfo.appendChild(mvName);
        mvInfo.appendChild(mvArtist);
        mvInfo.appendChild(mvPlayCount);

        mvItem.appendChild(mvCover);
        mvItem.appendChild(mvDuration);
        mvItem.appendChild(mvInfo);

        // 点击事件 - 播放MV
        mvItem.addEventListener('click', () => {
            window.location.href = `mv.html?id=${mv.id}`;
        });

        mvsListContainer.appendChild(mvItem);
    });
}

// 获取歌手全部歌曲
function getArtistAllSongs() {
    if (isLoading) return;
    isLoading = true;

    fetchWithCookie(`${apiBaseUrl}artist/songs?id=${artistId}&limit=${allSongsLimit}&offset=${allSongsOffset}`)
        .then(response => response.json())
        .then(data => {
            isLoading = false;
            if (data.code === 200 && data.songs && data.songs.length > 0) {
                allSongs = [...allSongs, ...data.songs];
                renderAllSongs();
                allSongsOffset += data.songs.length;
                if (data.songs.length < allSongsLimit) {
                    loadMoreBtnContainer.style.display = 'none';
                } else {
                    loadMoreBtnContainer.style.display = 'block';
                }
            } else {
                if (allSongs.length === 0) {
                    showNoData(allSongsListContainer, '暂无全部歌曲');
                }
                loadMoreBtnContainer.style.display = 'none';
            }
        })
        .catch(error => {
            isLoading = false;
            console.error('获取歌手全部歌曲失败:', error);
            if (allSongs.length === 0) {
                showNoData(allSongsListContainer, '获取全部歌曲失败');
            }
        });
}

// 渲染全部歌曲
function renderAllSongs() {
    allSongsListContainer.innerHTML = '';

    allSongs.forEach((song, index) => {
        let songItem = document.createElement('div');
        songItem.className = 'song-item';

        let songIndex = document.createElement('div');
        songIndex.className = 'mdui-text-color-primary mdui-font-bold';
        songIndex.textContent = index + 1;

        let songInfo = document.createElement('div');
        songInfo.className = 'song-info';

        let songName = document.createElement('div');
        songName.className = 'song-name';
        songName.textContent = song.name;

        let songArtist = document.createElement('div');
        songArtist.className = 'song-artist';
        songArtist.textContent = song.ar.map(artist => artist.name).join(' / ');

        let songAlbum = document.createElement('div');
        songAlbum.className = 'song-artist';
        songAlbum.textContent = song.al.name;

        songInfo.appendChild(songName);
        songInfo.appendChild(songArtist);
        songInfo.appendChild(songAlbum);

        songItem.appendChild(songIndex);
        songItem.appendChild(songInfo);

        // 点击事件 - 播放歌曲
        songItem.addEventListener('click', () => {
            window.location.href = `play.html?artistId=${artistId}&id=${song.id}`;
        });

        allSongsListContainer.appendChild(songItem);
    });
}

// 获取歌手描述
function getArtistDesc() {
    fetchWithCookie(`${apiBaseUrl}artist/desc?id=${artistId}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                // 检查是否有briefDesc或introduction数据
                if (data.briefDesc || (data.introduction && data.introduction.length > 0)) {
                    renderArtistDesc(data);
                } else if (data.intro) {
                    // 兼容旧版数据结构
                    renderArtistDesc({briefDesc: data.intro});
                } else {
                    showNoData(artistDesc, '暂无歌手描述');
                }
            } else {
                showNoData(artistDesc, '暂无歌手描述');
            }
        })
        .catch(error => {
            console.error('获取歌手描述失败:', error);
            showNoData(artistDesc, '获取描述失败');
        });
}

// 渲染热门歌曲
function renderHotSongs(songs) {
    songsListContainer.innerHTML = '';

    songs.forEach((song, index) => {
        let songItem = document.createElement('div');
        songItem.className = 'song-item';

        let songIndex = document.createElement('div');
        songIndex.className = 'mdui-text-color-primary mdui-font-bold';
        songIndex.textContent = index + 1;

        let songInfo = document.createElement('div');
        songInfo.className = 'song-info';

        let songName = document.createElement('div');
        songName.className = 'song-name';
        songName.textContent = song.name;

        let songArtist = document.createElement('div');
        songArtist.className = 'song-artist';
        songArtist.textContent = song.ar.map(artist => artist.name).join(' / ');

        songInfo.appendChild(songName);
        songInfo.appendChild(songArtist);

        songItem.appendChild(songIndex);
        songItem.appendChild(songInfo);

        // 点击事件 - 播放歌曲
        songItem.addEventListener('click', () => {
            window.location.href = `play.html?id=${song.id}`;
        });

        songsListContainer.appendChild(songItem);
    });
}

// 渲染专辑
function renderAlbums(albums) {
    albumsListContainer.innerHTML = '';

    albums.forEach(album => {
        let albumItem = document.createElement('div');
        albumItem.className = 'album-item';

        let albumCover = document.createElement('img');
        albumCover.className = 'album-cover';
        albumCover.src = album.picUrl || 'https://p1.music.126.net/default_album.jpg';
        albumCover.alt = album.name;

        let albumInfo = document.createElement('div');
        albumInfo.className = 'album-info';

        let albumName = document.createElement('div');
        albumName.className = 'album-name';
        albumName.textContent = album.name;

        let albumArtist = document.createElement('div');
        albumArtist.className = 'album-artist';
        albumArtist.textContent = album.artist.name;

        let albumDate = document.createElement('div');
        albumDate.className = 'album-artist';
        albumDate.textContent = formatDate(album.publishTime);

        albumInfo.appendChild(albumName);
        albumInfo.appendChild(albumArtist);
        albumInfo.appendChild(albumDate);

        albumItem.appendChild(albumCover);
        albumItem.appendChild(albumInfo);

        // 点击事件 - 查看专辑
        albumItem.addEventListener('click', () => {
            window.location.href = `album.html?id=${album.id}`;
        });

        albumsListContainer.appendChild(albumItem);
    });
}

// 渲染MV
function renderMvs(mvs) {
    mvsListContainer.innerHTML = '';

    mvs.forEach(mv => {
        let mvItem = document.createElement('div');
        mvItem.className = 'mv-item';

        let mvCover = document.createElement('img');
        mvCover.className = 'mv-cover';
        mvCover.src = mv.imgurl || 'https://p1.music.126.net/default_mv.jpg';
        mvCover.alt = mv.name;

        let mvDuration = document.createElement('div');
        mvDuration.className = 'mv-duration';
        mvDuration.textContent = formatDuration(mv.duration);

        let mvInfo = document.createElement('div');
        mvInfo.className = 'mv-info';

        let mvName = document.createElement('div');
        mvName.className = 'mv-name';
        mvName.textContent = mv.name;

        let mvArtist = document.createElement('div');
        mvArtist.className = 'mv-artist';
        mvArtist.textContent = mv.artistName;

        let mvPlayCount = document.createElement('div');
        mvPlayCount.className = 'mv-artist';
        mvPlayCount.textContent = `播放量: ${formatPlayCount(mv.playCount)}`;

        mvInfo.appendChild(mvName);
        mvInfo.appendChild(mvArtist);
        mvInfo.appendChild(mvPlayCount);

        mvItem.appendChild(mvCover);
        mvItem.appendChild(mvDuration);
        mvItem.appendChild(mvInfo);

        // 点击事件 - 播放MV
        mvItem.addEventListener('click', () => {
            window.location.href = `mv.html?id=${mv.id}`;
        });

        mvsListContainer.appendChild(mvItem);
    });
}

// 渲染歌手描述
function renderArtistDesc(data) {
    let html = '';

    // 先渲染简介
    if (data.briefDesc) {
        html += `<div class="desc-section">
            <h3 class="desc-title">简介</h3>
            <p>${data.briefDesc.replace(/\n/g, '<br>')}</p>
        </div>`;
    }

    // 再渲染详细介绍
    if (data.introduction && data.introduction.length > 0) {
        data.introduction.forEach(item => {
            html += `<div class="desc-section">
                <h3 class="desc-title">${item.ti}</h3>
                <p>${item.txt.replace(/\n/g, '<br>')}</p>
            </div>`;
        });
    }

    artistDesc.innerHTML = html;

    // 添加样式
    let style = document.createElement('style');
    style.textContent = `
        .desc-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .desc-section:last-child {
            border-bottom: none;
        }
        .desc-title {
            font-size: 18px;
            margin-bottom: 10px;
            color: #333;
        }
    `;
    document.head.appendChild(style);
}

// 显示无数据提示
function showNoData(container, text) {
    container.innerHTML = `
        <div class="no-data">
            <i class="mdui-icon material-icons mdui-text-color-gray-400" style="font-size: 48px;">sentiment_dissatisfied</i>
            <p>${text}</p>
        </div>
    `;
}

// 格式化日期
function formatDate(time) {
    if (!time) return '未知';
    let date = new Date(time);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// 格式化时长（毫秒转分:秒）
function formatDuration(duration) {
    if (!duration) return '00:00';
    // 转换为秒
    let seconds = Math.floor(duration / 1000);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// 格式化播放次数/粉丝数等
function formatPlayCount(count) {
    if (count >= 100000000) {
        return `${(count / 100000000).toFixed(1)}亿`;
    } else if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
    } else {
        return count.toString();
    }
}

// 初始化标签页切换
function initTabs() {
    // 创建加载更多按钮
    createLoadMoreAlbumsBtn();
    createLoadMoreMvsBtn();

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            let tab = link.getAttribute('data-tab');
            if (tab === currentTab) return;

            // 隐藏当前标签页内容
            document.getElementById(currentTab).style.display = 'none';

            // 显示新标签页内容
            currentTab = tab;
            document.getElementById(currentTab).style.display = 'block';

            // 加载对应的数据（如果尚未加载）
            if (currentTab === 'albums') {
                if (albums.length === 0) {
                    getArtistAlbums();
                }
                // 显示或隐藏加载更多按钮
                loadMoreAlbumsBtn.style.display = hasMoreAlbums ? 'block' : 'none';
            } else if (currentTab === 'mvs') {
                if (mvs.length === 0) {
                    getArtistMvs();
                }
                // 显示或隐藏加载更多按钮
                loadMoreMvsBtn.style.display = hasMoreMvs ? 'block' : 'none';
            } else if (currentTab === 'desc' && artistDesc.innerHTML.includes('loading')) {
                getArtistDesc();
            } else if (currentTab === 'allSongs') {
                if (allSongs.length === 0) {
                    getArtistAllSongs();
                }
            }

            // 更新标签页激活状态
            tabLinks.forEach(l => l.classList.remove('mdui-tab-active'));
            link.classList.add('mdui-tab-active');
        });
    });
}

// 创建专辑加载更多按钮
function createLoadMoreAlbumsBtn() {
    loadMoreAlbumsBtn = document.createElement('div');
    loadMoreAlbumsBtn.className = 'load-more-btn mdui-center';
    loadMoreAlbumsBtn.innerHTML = '<button class="mdui-btn mdui-btn-block mdui-btn-outlined mdui-text-color-primary">加载更多</button>';
    loadMoreAlbumsBtn.style.display = 'none';
    loadMoreAlbumsBtn.addEventListener('click', function() {
        if (hasMoreAlbums && !isLoading) {
            getArtistAlbums();
        }
    });
    // 将按钮添加到专辑列表容器之后
    albumsListContainer.parentNode.insertBefore(loadMoreAlbumsBtn, albumsListContainer.nextSibling);
}

// 创建MV加载更多按钮
function createLoadMoreMvsBtn() {
    loadMoreMvsBtn = document.createElement('div');
    loadMoreMvsBtn.className = 'load-more-btn mdui-center';
    loadMoreMvsBtn.innerHTML = '<button class="mdui-btn mdui-btn-block mdui-btn-outlined mdui-text-color-primary">加载更多</button>';
    loadMoreMvsBtn.style.display = 'none';
    loadMoreMvsBtn.addEventListener('click', function() {
        if (hasMoreMvs && !isLoading) {
            getArtistMvs();
        }
    });
    // 将按钮添加到MV列表容器之后
    mvsListContainer.parentNode.insertBefore(loadMoreMvsBtn, mvsListContainer.nextSibling);
}

// 搜索相关功能
function initSearch() {
    // 搜索按钮点击事件
    searchIcon.addEventListener('click', () => {
        let keyword = searchInput.value.trim();
        if (keyword) {
            window.location.href = `search.html?keyword=${encodeURIComponent(keyword)}`;
        }
    });

    // 搜索输入框回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            let keyword = searchInput.value.trim();
            if (keyword) {
                window.location.href = `search.html?keyword=${encodeURIComponent(keyword)}`;
            }
        }
    });
}

// 初始化事件监听
function initEventListeners() {
    // 播放全部按钮点击事件
    playBtn.addEventListener('click', () => {
        window.location.href = `play.html?artistId=${artistId}`;
    });

    // 关注按钮点击事件
    followBtn.addEventListener('click', () => {
        // 这里只是模拟关注/取消关注功能
        isFollowing = !isFollowing;
        if (isFollowing) {
            followBtn.innerHTML = '<i class="mdui-icon material-icons">person_remove</i> 已关注';
            followBtn.classList.add('mdui-text-color-primary');
        } else {
            followBtn.innerHTML = '<i class="mdui-icon material-icons">person_add</i> 关注';
            followBtn.classList.remove('mdui-text-color-primary');
        }
        mdui.snackbar({ message: isFollowing ? '关注成功' : '取消关注成功' });
    });

    // 分享按钮点击事件
    shareBtn.addEventListener('click', () => {
        mdui.snackbar({ message: '分享功能暂未实现' });
    });

    // 加载更多按钮点击事件
    loadMoreBtn.addEventListener('click', () => {
        getArtistAllSongs();
    });

    // 初始化标签页
    initTabs();

    // 初始化搜索功能
    initSearch();
}

// 初始化
function init() {
    if (getUrlParams()) {
        initEventListeners();
        getArtistInfo();
        getArtistDetail();
        getArtistFanCount();
        getArtistDesc();
    }
}

document.addEventListener('DOMContentLoaded', init);
