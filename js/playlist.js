// 从URL获取歌单ID
function getPlaylistIdFromUrl() {
    let params = new URLSearchParams(window.location.search);
    return params.get('id') || '24381616'; // 默认歌单ID
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

// 格式化时间
function formatDuration(ms) {
    let minutes = Math.floor(ms / 60000);
    let seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 获取歌单详情
function getPlaylistDetail(id) {
    return fetch(`https://163api.ciallo.uk/playlist/detail?id=${id}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取歌单所有歌曲
function getPlaylistTracks(id) {
    return fetch(`https://api.qijieya.cn/meting/?type=playlist&id=${id}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取歌单评论
function getPlaylistComments(id, limit = 20, offset = 0) {
    return fetchWithCookie(`/comment/playlist?id=${id}&limit=${limit}&offset=${offset}`)
        .then(response => response.json())
        .then(data => data);
}

// 渲染歌单详情
function renderPlaylistDetail(playlist) {
    document.getElementById('playlistHeader').style.setProperty('--cover-image', `url(${playlist.coverImgUrl}?param=1000x400)`);
    document.getElementById('playlistCover').src = `${playlist.coverImgUrl}?param=300x300`;
    document.getElementById('playlistName').textContent = playlist.name;
    // 动态设置页面标题
    document.title = `${playlist.name} - NekoMusic`;
    document.getElementById('playlistCreator').textContent = `by ${playlist.creator.nickname}`;
    document.getElementById('playlistDesc').textContent = playlist.description || '暂无描述';
    document.getElementById('playlistPlayCount').textContent = formatPlayCount(playlist.playCount);
    document.getElementById('playlistFavCount').textContent = formatPlayCount(playlist.subscribedCount);
    document.getElementById('playlistCommentCount').textContent = formatPlayCount(playlist.commentCount);
    document.getElementById('playlistTrackCount').textContent = playlist.trackCount;
}

// 渲染歌曲列表
function renderSongList(songs) {
    let songListContainer = document.getElementById('songList');
    let playlistId = getPlaylistIdFromUrl(); 
    let html = '';
    
    songs.forEach((song, index) => {
        // --- 兼容新旧 API 的解析 ---
        let name = song.name;
        // 新API直接是 artist，旧API是 ar 数组
        let artist = song.artist || (song.ar ? song.ar.map(a => a.name).join('/') : '未知歌手');
        // 新API是 pic，旧API是 al.picUrl
        let pic = song.pic || (song.al ? song.al.picUrl : '');
        // 时长如果没有返回，就默认 00:00，进入播放页会自动获取
        let duration = song.dt ? formatDuration(song.dt) : '00:00';
        
        // 新 API 返回的歌单不带直接的 id 字段，需要从 url 提取
        let songId = song.id;
        if (!songId && song.url) {
            let match = song.url.match(/id=(\d+)/);
            if (match) songId = match[1];
        }

        html += `
        <div class="mdui-row song-item" onclick="playSong('${songId}')">
        <div class="mdui-col-xs-1 song-index">${index + 1}</div>
        <div class="mdui-col-xs-6 song-name"><div class="mdui-list-item-avatar"><img src="${pic}"/></div>${name}</div>
        <div class="mdui-col-xs-2 song-artist">${artist}</div>
        <div class="mdui-col-xs-1 song-duration">${duration}</div>
        <div class="mdui-col-xs-2 song-actions">
        <button class="mdui-btn mdui-btn-raised mdui-ripple" onclick="event.stopPropagation(); playIntelligenceMode('${songId}', '${playlistId}')">心动模式</button>
        </div>
        </div>
        `;
    });
    songListContainer.innerHTML = html;
}

// 播放歌曲
function playSong(songId) {
    window.location.href = `play.html?playlistId=${getPlaylistIdFromUrl()}&id=${songId}`;
}

// 渲染评论列表
function renderCommentList(comments) {
    let commentListContainer = document.getElementById('commentList');
    let html = '';

    comments.forEach(comment => {
        html += `
        <div class="mdui-card mdui-m-b-3">
            <div class="mdui-card-content">
                <div class="mdui-row">
                    <div class="mdui-col-xs-2">
                        <img src="${comment.user.avatarUrl}?param=60x60" alt="用户头像" class="mdui-img-circle">
                    </div>
                    <div class="mdui-col-xs-10">
                        <div class="mdui-row">
                            <div class="mdui-col-xs-8">
                                <h3 class="mdui-text-subtitle-1">${comment.user.nickname}</h3>
                            </div>
                            <div class="mdui-col-xs-4 mdui-text-right">
                                <span class="mdui-text-sm mdui-text-color-gray-500">${new Date(comment.time).toLocaleString()}</span>
                            </div>
                        </div>
                        <p class="mdui-m-t-1">${comment.content}</p>
                        <div class="mdui-row mdui-m-t-1">
                            <div class="mdui-col-xs-12 mdui-text-right">
                                <button class="mdui-btn mdui-btn-icon mdui-text-color-gray-400"><i class="mdui-icon material-icons">thumb_up</i></button>
                                <span class="mdui-text-sm mdui-text-color-gray-500">${comment.likedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    commentListContainer.innerHTML = html || '<p class="mdui-text-center mdui-text-color-gray-500 mdui-m-t-4">暂无评论</p>';
}

// 初始化标签页切换已由MDUI自动处理
// 仅保留评论加载逻辑
function loadCommentsWhenTabChanged() {
    document.querySelector('#playlistTabs').addEventListener('change.mdui.tab', function(event) {
        let index = event._detail.index;
        if (index === 1) { // 评论标签页索引
            let playlistId = getPlaylistIdFromUrl();
            // 直接使用歌单ID获取评论
            getPlaylistComments(playlistId).then(commentData => {
                renderCommentList(commentData.comments || []);
            }).catch(error => {
                console.error('加载评论失败:', error);
                mdui.snackbar({ message: '加载评论失败' });
            });
        }
    });
}

// 心动模式跳转
function playIntelligenceMode(songId, playlistId) {
    window.location.href = `play.html?playlistId=${playlistId}&id=${songId}&mode=intelligence`;
}

// 初始化页面
function init() {
    let playlistId = getPlaylistIdFromUrl();

    // 为播放全部按钮添加点击事件
    document.getElementById('playAllBtn').addEventListener('click', () => {
        window.location.href = `play.html?playlistId=${playlistId}`;
    });

    // 初始化标签页评论加载逻辑
    loadCommentsWhenTabChanged();

    // 加载歌单详情
    getPlaylistDetail(playlistId).then(data => {
        if (data.playlist) {
            renderPlaylistDetail(data.playlist);
        }
    }).catch(error => {
        console.error('加载歌单详情失败:', error);
        mdui.snackbar({ message: '加载歌单详情失败' });
    });

    // 加载歌单歌曲
    getPlaylistTracks(playlistId).then(data => {
        if (data.songs) {
            renderSongList(data.songs);
        }
    }).catch(error => {
        console.error('加载歌单歌曲失败:', error);
        mdui.snackbar({ message: '加载歌单歌曲失败' });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    // 初始化主题
    if (window.ThemeManager && ThemeManager.initTheme) {
        ThemeManager.initTheme();
    }
});
