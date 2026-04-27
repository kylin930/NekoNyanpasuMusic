// 基础API URL
let apiBaseUrl = ThemeManager.getApiBaseUrl();
let albumId = null;
let currentCommentPage = 1;
let commentPageSize = 20;
let isSubscribed = false;

// DOM元素
let albumCover = document.getElementById('albumCover');
let albumTitle = document.getElementById('albumTitle');
let artistLink = document.getElementById('artistLink');
let albumMeta = document.getElementById('albumMeta');
let likeCount = document.getElementById('likeCount');
let commentCount = document.getElementById('commentCount');
let shareCount = document.getElementById('shareCount');
let subCount = document.getElementById('subCount');
let playAllBtn = document.getElementById('playAllBtn');
let collectBtn = document.getElementById('collectBtn');
let shareBtn = document.getElementById('shareBtn');
let songListContainer = document.getElementById('songListContainer');
let commentListContainer = document.getElementById('commentListContainer');
let commentCountText = document.getElementById('commentCountText');
let loadMoreCommentsBtn = document.getElementById('loadMoreCommentsBtn');
let searchInput = document.getElementById('searchInput');
let searchIcon = document.getElementById('searchIcon');
let searchSuggestions = document.getElementById('searchSuggestions');

// 获取URL参数
function getUrlParams() {
    let params = new URLSearchParams(window.location.search);
    albumId = params.get('id');
    if (!albumId) {
        // 如果没有专辑ID，跳转到首页
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 获取专辑信息
function getAlbumInfo() {
    fetchWithCookie(`${apiBaseUrl}album?id=${albumId}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.songs && data.songs.length > 0) {
                // 专辑信息
                let album = data.songs[0].al;
                albumCover.src = `https://p1.music.126.net/${album.pic_str}/${album.pic}.jpg`;
                albumTitle.textContent = album.name;
                document.title = `NekoMusic - ${album.name}`;
                // 歌手信息
                let artist = data.songs[0].ar[0];
                artistLink.textContent = artist.name;
                artistLink.href = `artist.html?id=${artist.id}`;

                // 专辑元信息
                // 从API数据中提取发行时间（实际项目中可能需要从其他字段获取）
                let publishTime = data.publishTime ? new Date(data.publishTime) : new Date();
                let formattedDate = `${publishTime.getFullYear()}-${(publishTime.getMonth() + 1).toString().padStart(2, '0')}-${publishTime.getDate().toString().padStart(2, '0')}`;
                albumMeta.textContent = `发行时间: ${formattedDate} · ${data.songs.length}首歌曲`;

                // 渲染歌曲列表
                renderSongList(data.songs);
            } else {
                showNoData(songListContainer, '获取专辑信息失败');
            }
        })
        .catch(error => {
            console.error('获取专辑信息失败:', error);
            showNoData(songListContainer, '获取专辑信息失败');
        });
}

// 获取专辑动态信息
function getAlbumDynamicInfo() {
    fetchWithCookie(`${apiBaseUrl}album/detail/dynamic?id=${albumId}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                likeCount.textContent = formatPlayCount(data.likedCount);
                commentCount.textContent = formatPlayCount(data.commentCount);
                shareCount.textContent = formatPlayCount(data.shareCount);
                subCount.textContent = formatPlayCount(data.subCount);
                isSubscribed = data.isSub;

                // 更新收藏按钮状态
                updateCollectButton();

                // 更新评论计数
                commentCountText.textContent = `(${data.commentCount})`;
            }
        })
        .catch(error => {
            console.error('获取专辑动态信息失败:', error);
        });
}

// 获取专辑评论
function getAlbumComments(page = 1) {
    let offset = (page - 1) * commentPageSize;
    fetchWithCookie(`${apiBaseUrl}comment/album?id=${albumId}&limit=${commentPageSize}&offset=${offset}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.comments) {
                if (page === 1) {
                    commentListContainer.innerHTML = '';
                }

                if (data.comments.length === 0) {
                    if (page === 1) {
                        showNoData(commentListContainer, '暂无评论');
                    }
                    loadMoreCommentsBtn.style.display = 'none';
                    return;
                }

                renderComments(data.comments);

                // 如果还有更多评论，显示加载更多按钮
                if (data.comments.length === commentPageSize) {
                    loadMoreCommentsBtn.style.display = 'block';
                } else {
                    loadMoreCommentsBtn.style.display = 'none';
                }
            } else {
                if (page === 1) {
                    showNoData(commentListContainer, '获取评论失败');
                }
            }
        })
        .catch(error => {
            console.error('获取专辑评论失败:', error);
            if (page === 1) {
                showNoData(commentListContainer, '获取评论失败');
            }
        });
}

// 渲染歌曲列表
function renderSongList(songs) {
    songListContainer.innerHTML = '';

    songs.forEach((song, index) => {
        let listItem = document.createElement('li');
        listItem.className = 'mdui-list-item mdui-ripple';

        // 歌曲索引
        let indexSpan = document.createElement('div');
        indexSpan.className = 'mdui-col-xs-1 mdui-text-color-gray-500';
        indexSpan.textContent = index + 1;

        // 歌曲信息
        let infoDiv = document.createElement('div');
        infoDiv.className = 'mdui-col-xs-8';

        let songNameDiv = document.createElement('div');
        songNameDiv.className = 'mdui-text-truncate';
        songNameDiv.textContent = song.name;

        let artistAlbumDiv = document.createElement('div');
        artistAlbumDiv.className = 'mdui-text-color-gray-500 mdui-text-sm';
        artistAlbumDiv.textContent = `${song.ar.map(artist => artist.name).join(' / ')} - ${song.al.name}`;

        infoDiv.appendChild(songNameDiv);
        infoDiv.appendChild(artistAlbumDiv);

        // 歌曲时长
        let durationDiv = document.createElement('div');
        durationDiv.className = 'mdui-col-xs-2 mdui-text-right mdui-text-color-gray-500 mdui-text-sm';
        durationDiv.textContent = formatDuration(song.dt);

        // 播放按钮
        let playBtnDiv = document.createElement('div');
        playBtnDiv.className = 'mdui-col-xs-1 mdui-text-right';
        playBtnDiv.innerHTML = '<button class="mdui-btn mdui-btn-icon mdui-text-color-gray-400"><i class="mdui-icon material-icons">play_arrow</i></button>';

        listItem.appendChild(indexSpan);
        listItem.appendChild(infoDiv);
        listItem.appendChild(durationDiv);
        listItem.appendChild(playBtnDiv);

        // 点击事件 - 播放歌曲
        playBtnDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `play.html?id=${song.id}`;
        });

        // 点击事件 - 播放歌曲
        listItem.addEventListener('click', () => {
            window.location.href = `play.html?id=${song.id}`;
        });

        songListContainer.appendChild(listItem);
    });
}

// 渲染评论
function renderComments(comments) {
    comments.forEach(comment => {
        let commentItem = document.createElement('div');
        commentItem.className = 'comment-item';

        // 用户信息
        let userInfoDiv = document.createElement('div');
        userInfoDiv.className = 'comment-user-info';

        let avatarImg = document.createElement('img');
        avatarImg.className = 'comment-avatar';
        avatarImg.src = comment.user.avatarUrl;

        let userNameSpan = document.createElement('span');
        userNameSpan.className = 'comment-user-name';
        userNameSpan.textContent = comment.user.nickname;

        let timeSpan = document.createElement('span');
        timeSpan.className = 'comment-time';
        timeSpan.textContent = formatDate(comment.time);

        userInfoDiv.appendChild(avatarImg);
        userInfoDiv.appendChild(userNameSpan);
        userInfoDiv.appendChild(timeSpan);

        // 评论内容
        let contentDiv = document.createElement('div');
        contentDiv.className = 'comment-content';
        contentDiv.textContent = comment.content;

        // 评论回复（如果有）
        if (comment.beReplied && comment.beReplied.length > 0) {
            let replyDiv = document.createElement('div');
            replyDiv.className = 'mdui-panel mdui-panel-gapless mdui-m-t-1';
            replyDiv.innerHTML = `
                <div class="mdui-panel-item">
                    <div class="mdui-panel-item-body mdui-text-sm mdui-text-color-gray-600">
                        <p><span class="mdui-text-color-blue-500">@${comment.beReplied[0].user.nickname}:</span> ${comment.beReplied[0].content}</p>
                    </div>
                </div>
            `;
            contentDiv.appendChild(replyDiv);
        }

        // 评论操作
        let actionsDiv = document.createElement('div');
        actionsDiv.className = 'comment-actions';

        let likeDiv = document.createElement('div');
        likeDiv.className = 'comment-like';
        likeDiv.innerHTML = `
            <i class="mdui-icon material-icons comment-like-icon">thumb_up</i>
            <span>${comment.likedCount}</span>
        `;

        actionsDiv.appendChild(likeDiv);

        commentItem.appendChild(userInfoDiv);
        commentItem.appendChild(contentDiv);
        commentItem.appendChild(actionsDiv);

        commentListContainer.appendChild(commentItem);
    });
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

// 更新收藏按钮状态
function updateCollectButton() {
    if (isSubscribed) {
        collectBtn.innerHTML = '<i class="mdui-icon material-icons">favorite</i> 已收藏';
        collectBtn.classList.add('mdui-text-color-red-500');
    } else {
        collectBtn.innerHTML = '<i class="mdui-icon material-icons">favorite_border</i> 收藏';
        collectBtn.classList.remove('mdui-text-color-red-500');
    }
}

// 格式化日期
function formatDate(time) {
    let date = new Date(time);
    let now = new Date();
    let diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 小于30天
    if (diff < 2592000000) {
        return `${Math.floor(diff / 86400000)}天前`;
    }
    // 小于1年
    if (diff < 31536000000) {
        let month = date.getMonth() + 1;
        let day = date.getDate();
        return `${month}月${day}日`;
    }
    // 大于1年
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 格式化时长（毫秒转分:秒）
function formatDuration(duration) {
    // 转换为秒
    let seconds = Math.floor(duration / 1000);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// 格式化播放次数/收藏数等
function formatPlayCount(count) {
    if (count >= 100000000) {
        return `${(count / 100000000).toFixed(1)}亿`;
    } else if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
    } else {
        return count.toString();
    }
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
    playAllBtn.addEventListener('click', () => {
        window.location.href = `play.html?id=${albumId}&type=album`;
    });

    // 收藏按钮点击事件
    collectBtn.addEventListener('click', () => {
        // 这里只是模拟收藏/取消收藏功能
        isSubscribed = !isSubscribed;
        updateCollectButton();
        mdui.snackbar({ message: isSubscribed ? '收藏成功' : '取消收藏成功' });
    });

    // 分享按钮点击事件
    shareBtn.addEventListener('click', () => {
        mdui.snackbar({ message: '分享功能暂未实现' });
    });

    // 加载更多评论按钮点击事件
    loadMoreCommentsBtn.addEventListener('click', () => {
        currentCommentPage++;
        getAlbumComments(currentCommentPage);
    });

    // 初始化搜索功能
    initSearch();
}

// 初始化
function init() {
    if (getUrlParams()) {
        initEventListeners();
        getAlbumInfo();
        getAlbumDynamicInfo();
        getAlbumComments();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
