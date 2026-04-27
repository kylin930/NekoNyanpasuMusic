let isCommentSystemInitialized = false;
let commentSystem = null;

function initCommentSystemOnce() {
    // 评论功能相关变量
    let commentDialog = document.getElementById('comment-dialog');
    let commentBtn = document.getElementById('comment-btn');
    let commentList = document.getElementById('comment-list');
    let loadingIndicator = document.getElementById('loading-indicator');
    let floorCommentDialog = document.getElementById('floor-comment-dialog');
    let floorCommentList = document.getElementById('floor-comment-list');
    let floorLoadingIndicator = document.getElementById('floor-loading-indicator');

    // 初始化评论对话框
    let mduiCommentDialog = new mdui.Dialog(commentDialog);
    let mduiFloorCommentDialog = new mdui.Dialog(floorCommentDialog);

    // 返回主层评论按钮点击事件
    let backBtn = document.getElementById('back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // 关闭楼层评论对话框
            mduiFloorCommentDialog.close();
            // 打开主评论对话框
            mduiCommentDialog.open();
        });
    }

    // 添加评论对话框滚动监听
    commentDialog.querySelector('.mdui-dialog-content').addEventListener('scroll', () => {
        let content = commentDialog.querySelector('.mdui-dialog-content');
        if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
            loadComments();
        }
    });

    // 添加楼层评论对话框滚动监听
    floorCommentDialog.querySelector('.mdui-dialog-content').addEventListener('scroll', () => {
        let content = floorCommentDialog.querySelector('.mdui-dialog-content');
        if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
            loadFloorComments();
        }
    });

    return {
        commentDialog, commentBtn, commentList, loadingIndicator,
        floorCommentDialog, floorCommentList, floorLoadingIndicator,
        mduiCommentDialog, mduiFloorCommentDialog
    };
}

// 更新评论系统 - 切换歌曲时调用
function updateCommentSystem(songId) {
    // 存储当前歌曲ID
    window.currentSongId = songId;
    // 重置评论数据
    window.comments = [];
    window.commentOffset = 0;
    window.hasMoreComments = true;
    window.isLoadingComments = false;
    window.currentParentCommentId = null;
    window.floorComments = [];
    window.floorOffset = 0;
    window.hasMoreFloorComments = true;
    window.isLoadingFloorComments = false;

    // 点击评论按钮打开对话框
    commentSystem.commentBtn.addEventListener('click', () => {
        if (songId) {
            // 重置评论数据
            window.comments = [];
            window.commentOffset = 0;
            window.hasMoreComments = true;
            commentSystem.commentList.innerHTML = '';
            // 打开对话框并加载评论
            commentSystem.mduiCommentDialog.open();
            loadComments();
        } else {
            mdui.snackbar({ message: '无法获取歌曲ID' });
        }
    });
}

// 初始化评论系统入口
function initCommentSystem(songId) {
    // 如果是首次调用，执行一次性初始化
    if (!isCommentSystemInitialized) {
        commentSystem = initCommentSystemOnce();
        isCommentSystemInitialized = true;
    }
    // 更新评论系统
    updateCommentSystem(songId);
}

// 加载歌曲评论
function loadComments() {
    if (!window.hasMoreComments || window.isLoadingComments) return;

    window.isLoadingComments = true;
    commentSystem.loadingIndicator.style.display = 'block';

    fetch(`https://163api.ciallo.uk/comment/music?id=${window.currentSongId}&limit=100&offset=${window.commentOffset}`)
    .then(response => response.json())
    .then(data => {
        if (data.comments && data.comments.length > 0) {
            window.comments = [...window.comments, ...data.comments];
            renderComments();
            window.commentOffset += 100;
            window.hasMoreComments = data.comments.length === 100;
        } else {
            window.hasMoreComments = false;
            if (window.commentOffset === 0) {
                commentSystem.commentList.innerHTML = '<div class="mdui-center mdui-m-y-4">暂无评论</div>';
            }
        }
    })
    .catch(error => {
        console.error('加载评论失败:', error);
        mdui.snackbar({ message: '加载评论失败' });
    })
    .finally(() => {
        window.isLoadingComments = false;
        commentSystem.loadingIndicator.style.display = 'none';
    });
}

// 渲染评论列表
function renderComments() {
    let fragment = document.createDocumentFragment();

    window.comments.forEach(comment => {
        let commentItem = document.createElement('div');
        commentItem.className = 'mdui-card mdui-m-b-3';
        commentItem.style.borderRadius = '8px';

        // 格式化日期
        let timeStr = formatDate(comment.time);

        commentItem.innerHTML = `
        <div class="mdui-card-content">
        <div class="mdui-row">
        <div class="mdui-col-xs-2">
        <img src="${comment.user.avatarUrl}" class="mdui-img-circle" style="width: 40px; height: 40px;">
        </div>
        <div class="mdui-col-xs-10">
        <div class="mdui-row">
        <div class="mdui-col-xs-8">
        <h4 class="mdui-typo-subheading">${comment.user.nickname} ${comment.user.vipType === 11 ? '<img src="' + (comment.user.vipRights?.associator?.iconUrl || comment.user.vipRights?.musicPackage?.iconUrl) + '" style="width:72px; height:24px; vertical-align: middle; margin-left:4px;">' : ''}</h4>
        </div>
        <div class="mdui-col-xs-4 mdui-text-right">
        <span class="mdui-text-color-grey-500 mdui-typo-caption">${timeStr}</span>
        </div>
        </div>
        <p class="mdui-typo-body-1 mdui-m-t-1">${comment.content}</p>
        <div class="mdui-row mdui-m-t-2">
        <div class="mdui-col-xs-12 mdui-text-right">
        <button class="mdui-btn mdui-btn-icon view-floor-comment" data-comment-id="${comment.commentId}">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">comment</i>
        </button>
        <span class="mdui-text-color-grey-500">${comment.showFloorComment ? comment.showFloorComment.replyCount : 0}</span>
        <button class="mdui-btn mdui-btn-icon">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">thumb_up</i>
        </button>
        <span class="mdui-text-color-grey-500">${comment.likedCount}</span>
        </div>
        </div>
        </div>
        </div>
        </div>
        `;

        fragment.appendChild(commentItem);
    });

    commentSystem.commentList.appendChild(fragment);
    commentSystem.mduiCommentDialog.handleUpdate();

    // 绑定查看楼层评论事件
    document.querySelectorAll('.view-floor-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let commentId = e.currentTarget.dataset.commentId;
            openFloorCommentDialog(commentId);
        });
    });
}

// 打开楼层评论对话框
function openFloorCommentDialog(parentCommentId) {
    window.currentParentCommentId = parentCommentId;
    // 重置楼层评论数据
    window.floorComments = [];
    window.floorOffset = 0;
    window.hasMoreFloorComments = true;
    commentSystem.floorCommentList.innerHTML = '';
    // 关闭主评论对话框
    commentSystem.mduiCommentDialog.close();
    // 打开对话框并加载楼层评论
    commentSystem.mduiFloorCommentDialog.open();
    loadFloorComments();
}

// 加载楼层评论
function loadFloorComments() {
    if (!window.hasMoreFloorComments || window.isLoadingFloorComments || !window.currentParentCommentId) return;

    window.isLoadingFloorComments = true;
    commentSystem.floorLoadingIndicator.style.display = 'block';

    fetch(`https://163api.ciallo.uk/comment/floor?parentCommentId=${window.currentParentCommentId}&id=${window.currentSongId}&type=0&limit=100&offset=${window.floorOffset}`)
    .then(response => response.json())
    .then(data => {
        if (data.data && data.data.comments && data.data.comments.length > 0) {
            window.floorComments = [...window.floorComments, ...data.data.comments];
            renderFloorComments();
            window.floorOffset += 100;
            window.hasMoreFloorComments = data.data.comments.length === 100;
        } else {
            window.hasMoreFloorComments = false;
            if (window.floorOffset === 0) {
                commentSystem.floorCommentList.innerHTML = '<div class="mdui-center mdui-m-y-4">暂无楼层评论</div>';
            }
        }
    })
    .catch(error => {
        console.error('加载楼层评论失败:', error);
        mdui.snackbar({ message: '加载楼层评论失败' });
    })
    .finally(() => {
        window.isLoadingFloorComments = false;
        commentSystem.floorLoadingIndicator.style.display = 'none';
    });
}

// 渲染楼层评论列表
function renderFloorComments() {
    let fragment = document.createDocumentFragment();

    window.floorComments.forEach(comment => {
        let commentItem = document.createElement('div');
        commentItem.className = 'mdui-card mdui-m-b-3';
        commentItem.style.borderRadius = '8px';

        // 格式化日期
        let timeStr = formatDate(comment.time);

        // 处理回复信息
        let repliedContent = '';
        if (comment.beReplied && comment.beReplied.length > 0) {
            let replied = comment.beReplied[0];
            repliedContent = `
            <div class="mdui-card mdui-m-b-2" style="background-color: #f5f5f5; border-radius: 8px;">
            <div class="mdui-card-content">
            <p class="mdui-typo-caption mdui-text-color-blue">@${replied.user.nickname}:</p>
            <p class="mdui-typo-body-2">${replied.content || '[内容已删除]'}</p>
            </div>
            </div>
            `;
        }

        commentItem.innerHTML = `
        <div class="mdui-card-content">
        <div class="mdui-row">
        <div class="mdui-col-xs-2">
        <img src="${comment.user.avatarUrl}" class="mdui-img-circle" style="width: 40px; height: 40px;">
        </div>
        <div class="mdui-col-xs-10">
        <div class="mdui-row">
        <div class="mdui-col-xs-8">
        <h4 class="mdui-typo-subheading">${comment.user.nickname} ${comment.user.vipType === 11 ? '<img src="' + (comment.user.vipRights?.associator?.iconUrl || comment.user.vipRights?.musicPackage?.iconUrl) + '" style="width:72px; height:24px; vertical-align: middle; margin-left:4px;">' : ''}</h4>
        </div>
        <div class="mdui-col-xs-4 mdui-text-right">
        <span class="mdui-text-color-grey-500 mdui-typo-caption">${timeStr}</span>
        </div>
        </div>
        ${repliedContent}
        <p class="mdui-typo-body-1">${comment.content}</p>
        <div class="mdui-row mdui-m-t-2">
        <div class="mdui-col-xs-12 mdui-text-right">
        <button class="mdui-btn mdui-btn-icon">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">thumb_up</i>
        <span class="mdui-text-color-grey-500">${comment.likedCount}</span>
        </button>
        </div>
        </div>
        </div>
        </div>
        </div>
        `;

        fragment.appendChild(commentItem);
    });

    commentSystem.floorCommentList.appendChild(fragment);
    commentSystem.mduiFloorCommentDialog.handleUpdate();
}

// 格式化日期
function formatDate(time) {
    let date = new Date(time);
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function initCommentSystemOnce() {
    // 评论功能相关变量
    let commentDialog = document.getElementById('comment-dialog');
    let commentBtn = document.getElementById('comment-btn');
    let commentList = document.getElementById('comment-list');
    let loadingIndicator = document.getElementById('loading-indicator');
    let floorCommentDialog = document.getElementById('floor-comment-dialog');
    let floorCommentList = document.getElementById('floor-comment-list');
    let floorLoadingIndicator = document.getElementById('floor-loading-indicator');

    // 初始化评论对话框
    let mduiCommentDialog = new mdui.Dialog(commentDialog);
    let mduiFloorCommentDialog = new mdui.Dialog(floorCommentDialog);

    // 返回主层评论按钮点击事件
    let backBtn = document.getElementById('back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // 关闭楼层评论对话框
            mduiFloorCommentDialog.close();
            // 打开主评论对话框
            mduiCommentDialog.open();
        });
    }

    // 添加评论对话框滚动监听
    commentDialog.querySelector('.mdui-dialog-content').addEventListener('scroll', () => {
        let content = commentDialog.querySelector('.mdui-dialog-content');
        if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
            loadComments();
        }
    });

    // 添加楼层评论对话框滚动监听
    floorCommentDialog.querySelector('.mdui-dialog-content').addEventListener('scroll', () => {
        let content = floorCommentDialog.querySelector('.mdui-dialog-content');
        if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
            loadFloorComments();
        }
    });

    return {
        commentDialog, commentBtn, commentList, loadingIndicator,
        floorCommentDialog, floorCommentList, floorLoadingIndicator,
        mduiCommentDialog, mduiFloorCommentDialog
    };
}

// 更新评论系统 - 切换歌曲时调用
function updateCommentSystem(songId) {
    // 存储当前歌曲ID
    window.currentSongId = songId;
    // 重置评论数据
    window.comments = [];
    window.commentOffset = 0;
    window.hasMoreComments = true;
    window.isLoadingComments = false;
    window.currentParentCommentId = null;
    window.floorComments = [];
    window.floorOffset = 0;
    window.hasMoreFloorComments = true;
    window.isLoadingFloorComments = false;

    // 点击评论按钮打开对话框
    if (commentSystem && commentSystem.commentBtn) {
        commentSystem.commentBtn.onclick = () => {
            if (songId) {
                // 重置评论数据
                window.comments = [];
                window.commentOffset = 0;
                window.hasMoreComments = true;
                commentSystem.commentList.innerHTML = '';
                // 打开对话框并加载评论
                commentSystem.mduiCommentDialog.open();
                loadComments();
            } else {
                mdui.snackbar({ message: '无法获取歌曲ID' });
            }
        };
    }
}

// 初始化评论系统入口
function initCommentSystem(songId) {
    // 如果是首次调用，执行一次性初始化
    if (!isCommentSystemInitialized) {
        commentSystem = initCommentSystemOnce();
        isCommentSystemInitialized = true;
    }
    // 更新评论系统
    updateCommentSystem(songId);
}

// 加载歌曲评论
function loadComments() {
    if (!window.hasMoreComments || window.isLoadingComments) return;

    window.isLoadingComments = true;
    commentSystem.loadingIndicator.style.display = 'block';

    fetch(`https://163api.ciallo.uk/comment/music?id=${window.currentSongId}&limit=100&offset=${window.commentOffset}`)
    .then(response => response.json())
    .then(data => {
        if (data.comments && data.comments.length > 0) {
            window.comments = [...window.comments, ...data.comments];
            renderComments();
            window.commentOffset += 100;
            window.hasMoreComments = data.comments.length === 100;
        } else {
            window.hasMoreComments = false;
            if (window.commentOffset === 0) {
                commentSystem.commentList.innerHTML = '<div class="mdui-center mdui-m-y-4">暂无评论</div>';
            }
        }
    })
    .catch(error => {
        console.error('加载评论失败:', error);
        mdui.snackbar({ message: '加载评论失败' });
    })
    .finally(() => {
        window.isLoadingComments = false;
        commentSystem.loadingIndicator.style.display = 'none';
    });
}

// 渲染评论列表
function renderComments() {
    let fragment = document.createDocumentFragment();

    window.comments.forEach(comment => {
        let commentItem = document.createElement('div');
        commentItem.className = 'mdui-card mdui-m-b-3';
        commentItem.style.borderRadius = '8px';

        // 格式化日期
        let timeStr = formatDate(comment.time);

        commentItem.innerHTML = `
        <div class="mdui-card-content">
        <div class="mdui-row">
        <div class="mdui-col-xs-2">
        <img src="${comment.user.avatarUrl}" class="mdui-img-circle" style="width: 40px; height: 40px;">
        </div>
        <div class="mdui-col-xs-10">
        <div class="mdui-row">
        <div class="mdui-col-xs-8">
        <h4 class="mdui-typo-subheading">${comment.user.nickname} ${comment.user.vipType === 11 ? '<img src="' + (comment.user.vipRights?.associator?.iconUrl || comment.user.vipRights?.musicPackage?.iconUrl) + '" style="width:72px; height:24px; vertical-align: middle; margin-left:4px;">' : ''}</h4>
        </div>
        <div class="mdui-col-xs-4 mdui-text-right">
        <span class="mdui-text-color-grey-500 mdui-typo-caption">${timeStr}</span>
        </div>
        </div>
        <p class="mdui-typo-body-1 mdui-m-t-1">${comment.content}</p>
        <div class="mdui-row mdui-m-t-2">
        <div class="mdui-col-xs-12 mdui-text-right">
        <button class="mdui-btn mdui-btn-icon view-floor-comment" data-comment-id="${comment.commentId}">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">comment</i>
        </button>
        <span class="mdui-text-color-grey-500">${comment.showFloorComment ? comment.showFloorComment.replyCount : 0}</span>
        <button class="mdui-btn mdui-btn-icon">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">thumb_up</i>
        </button>
        <span class="mdui-text-color-grey-500">${comment.likedCount}</span>
        </div>
        </div>
        </div>
        </div>
        </div>
        `;

        fragment.appendChild(commentItem);
    });

    commentSystem.commentList.appendChild(fragment);
    commentSystem.mduiCommentDialog.handleUpdate();

    // 绑定查看楼层评论事件
    document.querySelectorAll('.view-floor-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let commentId = e.currentTarget.dataset.commentId;
            openFloorCommentDialog(commentId);
        });
    });
}

// 打开楼层评论对话框
function openFloorCommentDialog(parentCommentId) {
    window.currentParentCommentId = parentCommentId;
    // 重置楼层评论数据
    window.floorComments = [];
    window.floorOffset = 0;
    window.hasMoreFloorComments = true;
    commentSystem.floorCommentList.innerHTML = '';
    // 关闭主评论对话框
    commentSystem.mduiCommentDialog.close();
    // 打开对话框并加载楼层评论
    commentSystem.mduiFloorCommentDialog.open();
    loadFloorComments();
}

// 加载楼层评论
function loadFloorComments() {
    if (!window.hasMoreFloorComments || window.isLoadingFloorComments || !window.currentParentCommentId) return;

    window.isLoadingFloorComments = true;
    commentSystem.floorLoadingIndicator.style.display = 'block';

    fetch(`https://163api.ciallo.uk/comment/floor?parentCommentId=${window.currentParentCommentId}&id=${window.currentSongId}&type=0&limit=100&offset=${window.floorOffset}`)
    .then(response => response.json())
    .then(data => {
        if (data.data && data.data.comments && data.data.comments.length > 0) {
            window.floorComments = [...window.floorComments, ...data.data.comments];
            renderFloorComments();
            window.floorOffset += 100;
            window.hasMoreFloorComments = data.data.comments.length === 100;
        } else {
            window.hasMoreFloorComments = false;
            if (window.floorOffset === 0) {
                commentSystem.floorCommentList.innerHTML = '<div class="mdui-center mdui-m-y-4">暂无楼层评论</div>';
            }
        }
    })
    .catch(error => {
        console.error('加载楼层评论失败:', error);
        mdui.snackbar({ message: '加载楼层评论失败' });
    })
    .finally(() => {
        window.isLoadingFloorComments = false;
        commentSystem.floorLoadingIndicator.style.display = 'none';
    });
}

// 渲染楼层评论列表
function renderFloorComments() {
    let fragment = document.createDocumentFragment();

    window.floorComments.forEach(comment => {
        let commentItem = document.createElement('div');
        commentItem.className = 'mdui-card mdui-m-b-3';
        commentItem.style.borderRadius = '8px';

        // 格式化日期
        let timeStr = formatDate(comment.time);

        // 处理回复信息
        let repliedContent = '';
        if (comment.beReplied && comment.beReplied.length > 0) {
            let replied = comment.beReplied[0];
            repliedContent = `
            <div class="mdui-card mdui-m-b-2" style="background-color: #f5f5f5; border-radius: 8px;">
            <div class="mdui-card-content">
            <p class="mdui-typo-caption mdui-text-color-blue">@${replied.user.nickname}:</p>
            <p class="mdui-typo-body-2">${replied.content || '[内容已删除]'}</p>
            </div>
            </div>
            `;
        }

        commentItem.innerHTML = `
        <div class="mdui-card-content">
        <div class="mdui-row">
        <div class="mdui-col-xs-2">
        <img src="${comment.user.avatarUrl}" class="mdui-img-circle" style="width: 40px; height: 40px;">
        </div>
        <div class="mdui-col-xs-10">
        <div class="mdui-row">
        <div class="mdui-col-xs-8">
        <h4 class="mdui-typo-subheading">${comment.user.nickname} ${comment.user.vipType === 11 ? '<img src="' + (comment.user.vipRights?.associator?.iconUrl || comment.user.vipRights?.musicPackage?.iconUrl) + '" style="width:72px; height:24px; vertical-align: middle; margin-left:4px;">' : ''}</h4>
        </div>
        <div class="mdui-col-xs-4 mdui-text-right">
        <span class="mdui-text-color-grey-500 mdui-typo-caption">${timeStr}</span>
        </div>
        </div>
        ${repliedContent}
        <p class="mdui-typo-body-1">${comment.content}</p>
        <div class="mdui-row mdui-m-t-2">
        <div class="mdui-col-xs-12 mdui-text-right">
        <button class="mdui-btn mdui-btn-icon">
        <i class="mdui-icon material-icons mdui-text-color-grey-500">thumb_up</i>
        <span class="mdui-text-color-grey-500">${comment.likedCount}</span>
        </button>
        </div>
        </div>
        </div>
        </div>
        </div>
        `;

        fragment.appendChild(commentItem);
    });

    commentSystem.floorCommentList.appendChild(fragment);
    commentSystem.mduiFloorCommentDialog.handleUpdate();
}


