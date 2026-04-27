async function renderRecommendPl() {
    let timestamp = new Date().getTime();
    const res = await fetch(`https://moon-3c39.930390.xyz/?protocol=http&domain=mc.alger.fun&uri=/api/top/playlist?cat=&limit=42&offset=0&timestamp=${timestamp}&device=mobile&cookie=${localStorage.getItem('user_cookie')}`);
    let lll=await res.json();

    renderRecommendPlaylists(lll.playlists, '#playlistContainer');
}

/**
 * 安全转义 HTML 特殊字符（防 XSS）
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 格式化数字（如 277034 → 27.7万）
 */
function formatCount(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    }
    return num.toString();
}

/**
 * 渲染推荐歌单列表
 * @param {Array} playlists - 网易云返回的 playlist 数组
 * @param {string|HTMLElement} container - 容器选择器或元素
 */
function renderRecommendPlaylists(playlists, container) {
    const el = typeof container === 'string'
    ? document.querySelector(container)
    : container;

    if (!el) {
        console.error('容器未找到');
        return;
    }

    let html = '';

    playlists.forEach(item => {
        // 转义文本内容
        const name = escapeHtml(item.name);
        const nickname = escapeHtml(item.creator.nickname);

        // 播放/收藏信息
        const meta = `${formatCount(item.playCount)}次播放 · ${item.subscribedCount}人收藏`;

        // 标签 chips
        const tagsHtml = item.tags.map(tag => {
            const safeTag = escapeHtml(tag);
            return `<span class="recommend-item-tag">${safeTag}</span>`;
        }).join('');

        // 构建完整项
        html += `
        <div class="recommend-item">
        <a href="playlist.html?id=${item.id}" class="recommend-item-img">
        <img class="recommend-item-img-img"
        width="200"
        height="200"
        src="${item.coverImgUrl}?param=300y300"
        alt="${name}">
        </a>
        <a href="playlist.html?id=${item.id}" class="recommend-item-title">
        ${name}
        </a>
        <div class="recommend-item-meta">${meta}</div>
        <div class="recommend-item-tags">
        ${tagsHtml}
        </div>
        <a href="user.html?uid=${item.creator.userId}" class="recommend-item-creator">
        <img src="${item.creator.avatarUrl}?param=24y24">
        by ${nickname}
        </a>
        </div>
        `;
    });

    el.innerHTML = html;
}
