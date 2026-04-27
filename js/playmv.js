// playmv.js - 支持点赞、关注、评论功能（基于 fetchWithCookie）

let currentPage = 0;
let hasMoreComments = true;
let isLiked = false;
let isFollowing = false;
let artistId = null;
let mvid = null;

// 工具函数：格式化播放量/点赞数
function formatPlayCount(count) {
    if (count >= 100000000) return (count / 100000000).toFixed(1) + '亿';
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toString();
}

// 获取 MV 详情（含 artistId）
async function getMvDetail(mvid) {
    const res = await fetchWithCookie(`/mv/detail?mvid=${mvid}`);
    const data = await res.json();
    if (data.code !== 200) throw new Error('获取MV详情失败');
    return data.data;
}

// 获取 MV 播放地址
async function getMvUrl(mvid) {
    const res = await fetchWithCookie(`/mv/url?id=${mvid}`);
    const data = await res.json();
    if (data.code !== 200) throw new Error('获取MV地址失败');
    return data.data.url;
}

// 获取 MV 详细信息（含点赞数、评论数等）
async function getMvDetailInfo(mvid) {
    const res = await fetchWithCookie(`/mv/detail/info?mvid=${mvid}`);
    const data = await res.json();
    if (data.code !== 200) throw new Error('获取MV统计信息失败');
    return data.data;
}

// 加载评论（分页）
async function loadComments(mvid, page, reset = false) {
    if (!hasMoreComments && !reset) return;
    if (reset) {
        currentPage = 0;
        hasMoreComments = true;
        document.getElementById('commentsContainer').innerHTML = '';
    }

    const limit = 20;
    const offset = page * limit;
    const res = await fetchWithCookie(`/comment/mv?id=${mvid}&limit=${limit}&offset=${offset}`);
    const data = await res.json();
    if (data.code !== 200) {
        mdui.snackbar({ message: '加载评论失败', position: 'bottom' });
        return;
    }

    const comments = data.comments || [];
    const container = document.getElementById('commentsContainer');
    if (reset) container.innerHTML = '';

    if (comments.length === 0 && page === 0) {
        container.innerHTML = '<p class="mdui-typo">暂无评论</p>';
        hasMoreComments = false;
        return;
    }

    comments.forEach(comment => {
        const el = document.createElement('div');
        el.className = 'mdui-card mdui-m-b-2';
        el.innerHTML = `
        <div class="mdui-card-header">
        <img class="mdui-card-header-avatar" src="${comment.user.avatarUrl || '/assets/default_avatar.png'}" />
        <div class="mdui-card-header-title">${comment.user.nickname}</div>
        <div class="mdui-card-header-subtitle">${new Date(comment.time).toLocaleString()}</div>
        </div>
        <div class="mdui-card-content">${comment.content}</div>
        `;
        container.appendChild(el);
    });

    if (comments.length < limit) {
        hasMoreComments = false;
    } else {
        currentPage++;
    }
}

// 渲染 MV 基本信息（标题、歌手等）
function renderMvInfo(mvDetail, mvid) {
    const titleEl = document.getElementById('mvTitle');
    const artistEl = document.getElementById('mvArtist');
    const playCountEl = document.getElementById('mvPlayCount');
    const likeCountEl = document.getElementById('mvLikeCount');
    const commentCountEl = document.getElementById('mvCommentCount');

    if (titleEl) titleEl.textContent = mvDetail.name || '未知MV';
    if (artistEl) artistEl.textContent = mvDetail.artistName || '未知歌手';
    if (playCountEl) playCountEl.textContent = formatPlayCount(mvDetail.playCount || 0);
    if (likeCountEl) likeCountEl.textContent = formatPlayCount(mvDetail.likedCount || 0);
    if (commentCountEl) commentCountEl.textContent = formatPlayCount(mvDetail.commentCount || 0);

    // 更新评论标签数量
    const commentTab = document.getElementById('commentCount');
    if (commentTab) commentTab.textContent = `(${formatPlayCount(mvDetail.commentCount || 0)})`;
}

// 设置视频源
function setMvUrl(url) {
    const video = document.getElementById('mvPlayer');
    if (video && url) {
        video.src = url;
    }
}

// 更新按钮状态
function updateLikeButton() {
    const btn = document.getElementById('likeBtn');
    if (btn) {
        btn.textContent = isLiked ? '❤️ 已点赞' : '👍 点赞';
    }
}

function updateFollowButton() {
    const btn = document.getElementById('followArtistBtn');
    if (btn) {
        btn.textContent = isFollowing ? '✅ 已关注' : '➕ 关注歌手';
    }
}

// 绑定交互事件
function setupInteraction(mvid, artistId) {
    const likeBtn = document.getElementById('likeBtn');
    const followBtn = document.getElementById('followArtistBtn');
    const commentInput = document.getElementById('commentInput');
    const submitCommentBtn = document.getElementById('submitCommentBtn');

    // 点赞
    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            const t = isLiked ? 0 : 1;
            try {
                await fetchWithCookie(`/mv/sub?t=${t}&id=${mvid}`);
                isLiked = !isLiked;
                updateLikeButton();

                // 刷新点赞数
                const info = await getMvDetailInfo(mvid);
                const likeCountEl = document.getElementById('mvLikeCount');
                if (likeCountEl) likeCountEl.textContent = formatPlayCount(info.likedCount || 0);

                mdui.snackbar({ message: isLiked ? '已点赞' : '已取消点赞', position: 'top' });
            } catch (err) {
                console.error('点赞操作失败:', err);
                mdui.snackbar({ message: '请先登录', position: 'top' });
                isLiked = !isLiked;
                updateLikeButton();
            }
        });
    }

    // 关注歌手
    if (followBtn && artistId) {
        followBtn.addEventListener('click', async () => {
            const t = isFollowing ? 0 : 1;
            try {
                await fetchWithCookie(`/follow?id=${artistId}&t=${t}`);
                isFollowing = !isFollowing;
                updateFollowButton();
                mdui.snackbar({ message: isFollowing ? '已关注歌手' : '已取消关注', position: 'top' });
            } catch (err) {
                console.error('关注操作失败:', err);
                mdui.snackbar({ message: '请先登录', position: 'top' });
                isFollowing = !isFollowing;
                updateFollowButton();
            }
        });
    }

    // 发送评论
    if (submitCommentBtn && commentInput) {
        submitCommentBtn.addEventListener('click', async () => {
            const content = commentInput.value.trim();
            if (!content) {
                mdui.snackbar({ message: '评论内容不能为空', position: 'bottom' });
                return;
            }

            try {
                await fetchWithCookie(`/comment?t=1&type=1&id=${mvid}&content=${encodeURIComponent(content)}`);
                commentInput.value = '';
                mdui.snackbar({ message: '评论成功', position: 'bottom' });

                // 刷新评论列表和总数
                const info = await getMvDetailInfo(mvid);
                const commentCountEl = document.getElementById('mvCommentCount');
                const commentTab = document.getElementById('commentCount');
                if (commentCountEl) commentCountEl.textContent = formatPlayCount(info.commentCount || 0);
                if (commentTab) commentTab.textContent = `(${formatPlayCount(info.commentCount || 0)})`;

                // 重新加载第一页评论
                loadComments(mvid, 0, true);
            } catch (err) {
                console.error('评论失败:', err);
                mdui.snackbar({ message: '评论失败，请先登录', position: 'bottom' });
            }
        });
    }
}

// 初始化页面
async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    mvid = urlParams.get('id');
    if (!mvid) {
        mdui.snackbar({ message: '无效的MV ID', position: 'top' });
        return;
    }

    try {
        const mvDetail = await getMvDetail(mvid);
        artistId = mvDetail.artistId;

        // 加载播放地址
        const mvUrl = await getMvUrl(mvid);
        setMvUrl(mvUrl);

        // 加载统计信息并渲染
        const mvDetailInfo = await getMvDetailInfo(mvid);
        renderMvInfo({ ...mvDetail, ...mvDetailInfo }, mvid);

        // 初始化交互
        setupInteraction(mvid, artistId);

        // 加载评论
        loadComments(mvid, 0, true);

    } catch (err) {
        console.error('初始化失败:', err);
        mdui.snackbar({ message: '加载MV失败', position: 'top' });
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', init);
