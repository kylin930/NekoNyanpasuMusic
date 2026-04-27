// 基础API URL
let currentType = 1; // 默认搜索类型为单曲
let currentPage = 1;
let pageSize = 20;
let currentSongIds = [];

// DOM元素
let searchInput = document.getElementById('searchInput');
let searchIcon = document.getElementById('searchIcon');
let searchSuggestions = document.getElementById('searchSuggestions');
let searchTabs = document.querySelectorAll('#searchTypeTabs .mdui-tab');
let hotSearchTags = document.getElementById('hotSearchTags');
let searchResults = document.getElementById('searchResults');

// 获取默认搜索关键词
function getDefaultSearch() {
    fetchWithCookie(`/search/default`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data) {
                searchInput.placeholder = `搜索: ${data.data.realkeyword}`;
            }
        })
        .catch(error => {
            console.error('获取默认搜索关键词失败:', error);
        });
}

// 获取热搜列表
function getHotSearch() {
    fetch(`https://163api.ciallo.uk/search/hot/detail`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data) {
                hotSearchTags.innerHTML = '';
                data.data.forEach(item => {
                    let chip = document.createElement('div');
                    chip.className = 'mdui-chip mdui-color-theme-accent mdui-text-color-white';
                    let title = document.createElement('span');
                    title.className = 'mdui-chip-title';
                    title.textContent = item.searchWord;
                    chip.appendChild(title);
                    chip.addEventListener('click', () => {
                        searchInput.value = item.searchWord;
                        performSearch();
                    });
                    hotSearchTags.appendChild(chip);
                });
            }
        })
        .catch(error => {
            console.error('获取热搜列表失败:', error);
        });
}

// 添加防抖函数
function debounce(func, delay) {
    let timer;
    return function() {
        let context = this;
        let args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(context, args), delay);
    };
}

// 获取搜索建议
function getSearchSuggestions(keyword) {
    if (!keyword.trim()) {
        searchSuggestions.style.display = 'none';
        return;
    }

    fetch(`https://163api.ciallo.uk/search/suggest?keywords=${encodeURIComponent(keyword)}&type=mobile`)
    .then(response => response.json())
    .then(data => {
        if (data.code === 200 && data.result && data.result.allMatch && data.result.allMatch.length > 0) {
            // === 新逻辑：动态定位 + 生成 mdui-list ===
            const rect = searchInput.getBoundingClientRect();
            searchSuggestions.style.width = rect.width + 'px';
            searchSuggestions.style.left = rect.left + window.scrollX + 'px';
            searchSuggestions.style.top = rect.bottom + window.scrollY + 'px';

            let html = '<ul class="mdui-list mdui-list-dense">';
            data.result.allMatch.forEach(item => {
                html += `
                <li class="mdui-list-item mdui-ripple" data-keyword="${encodeURIComponent(item.keyword)}">
                <i class="mdui-list-item-icon mdui-icon material-icons">search</i>
                <div class="mdui-list-item-content">${item.keyword}</div>
                </li>`;
            });
            html += '</ul>';

            searchSuggestions.innerHTML = html;
            searchSuggestions.style.display = 'block';

            // 重新绑定点击事件（使用事件委托更高效，但这里简单重绑）
            searchSuggestions.querySelectorAll('.mdui-list-item').forEach(li => {
                li.addEventListener('click', () => {
                    const keyword = decodeURIComponent(li.dataset.keyword);
                    searchInput.value = keyword;
                    searchSuggestions.style.display = 'none';
                    performSearch();
                });
            });

        } else {
            searchSuggestions.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('获取搜索建议失败:', error);
        searchSuggestions.style.display = 'none';
    });
}

// 防抖处理后的搜索建议函数
let debouncedGetSearchSuggestions = debounce(getSearchSuggestions, 300);

// 执行搜索
function performSearch(append = false) {
    let keyword = searchInput.value.trim();
    if (!keyword) return;

    // 动态设置页面标题
    document.title = `${keyword} - NekoMusic`;

    // 新增：更新URL参数
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('s', keyword);
    window.history.replaceState({}, '', currentUrl.toString());

    searchSuggestions.style.display = 'none';
    if (!append) {
        searchResults.innerHTML='';
        document.getElementById('load').style.display = 'block';
    } else {
        // 显示加载中状态
        document.getElementById('loadMoreBtn')?.remove();
        document.getElementById('load').style.display = 'block'
    }

    let offset = (currentPage - 1) * pageSize;
    fetchWithCookie(`/cloudsearch?keywords=${encodeURIComponent(keyword)}&type=${currentType}&limit=${pageSize}&offset=${offset}`)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.result) {
                renderSearchResults(data.result, append);
            } else {
                if (append) {
                    // 移除加载中状态
                    let spinner = searchResults.querySelector('.mdui-spinner');
                    if (spinner) {
                        spinner.parentElement.remove();
                    }
                    // 显示加载失败提示
                    searchResults.insertAdjacentHTML('beforeend', '<div class="mdui-center mdui-m-y-2 mdui-text-color-red-500">加载失败，请重试</div>');
                } else {
                    searchResults.innerHTML = '<div class="mdui-center mdui-text-color-red-500">搜索失败，请重试</div>';
                }
            }
        })
        .catch(error => {
            console.error('搜索失败:', error);
            searchResults.innerHTML = '<div class="mdui-center mdui-text-color-red-500">搜索失败，请重试</div>';
        });
}

// 渲染搜索结果
function renderSearchResults(result, append = false) {
    if (!append) {
        searchResults.innerHTML='';
        document.getElementById('load').style.display = 'none';
    } else {
        // 移除加载中状态
        document.getElementById('load').style.display = 'none';
    }

    if (result.songCount === 0 && result.albumCount === 0 && result.artistCount === 0 &&
        result.playlistCount === 0 && result.userCount === 0 && result.mvCount === 0) {
        searchResults.innerHTML = '<div class="mdui-center">未找到相关结果</div>';
        return;
    }

    switch (currentType) {
        case 1: // 单曲
            if (!append) {
                currentSongIds = []; // 首次搜索，重置数组
            }

            if (result.songs && result.songs.length > 0) {
                // 先收集所有新 ID
                const newIds = result.songs.map(song => song.id);
                currentSongIds.push(...newIds); // 追加到全局数组

                result.songs.forEach((song, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';
                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = song.al.picUrl;
                    let info = document.createElement('div');
                    info.className = 'result-info';
                    let title = document.createElement('div');
                    title.className = 'result-title';
                    title.textContent = song.name;
                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    subtitle.textContent = `${song.ar.map(artist => artist.name).join(' / ')} - ${song.al.name}`;
                    info.appendChild(title);
                    info.appendChild(subtitle);
                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">play_arrow</i>';
                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 构造带 ids 参数的 URL
                    const playUrl = `play.html?id=${song.id}&ids=${currentSongIds.join(',')}`;

                    // 点击播放图标
                    action.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.location.href = playUrl;
                    });

                    // 点击整行
                    item.addEventListener('click', () => {
                        window.location.href = playUrl;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关单曲</div>';
            }
            break;
        case 10: // 专辑
            if (result.albums && result.albums.length > 0) {
                result.albums.forEach((album, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';

                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = album.picUrl;

                    let info = document.createElement('div');
                    info.className = 'result-info';

                    let title = document.createElement('div');
                    title.className = 'result-title';
                    title.textContent = album.name;

                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    subtitle.textContent = `${album.artist.name} · ${formatDate(album.publishTime)}`;

                    info.appendChild(title);
                    info.appendChild(subtitle);

                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">arrow_forward</i>';

                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 点击专辑条目跳转到专辑详情页面
                    item.addEventListener('click', () => {
                        window.location.href = `album.html?id=${album.id}`;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关专辑</div>';
            }
            break;
        case 100: // 歌手
            if (result.artists && result.artists.length > 0) {
                result.artists.forEach((artist, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';

                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = artist.img1v1Url;

                    let info = document.createElement('div');
                    info.className = 'result-info';

                    let title = document.createElement('div');
                    title.className = 'result-title';
                    // 显示排名、姓名和译名
                    let titleText = artist.name;
                    if (artist.trans) {
                        titleText += ` (${artist.trans})`;
                    } else if (artist.transNames && artist.transNames.length > 0) {
                        titleText += ` (${artist.transNames[0]})`;
                    }
                    title.textContent = titleText;

                    // 处理别名
                    let aliasText = document.createElement('div');
                    aliasText.className = 'result-alias';
                    let aliases = [];
                    if (artist.alias && artist.alias.length > 0) {
                        aliases = aliases.concat(artist.alias);
                    }
                    if (artist.alia && artist.alia.length > 0) {
                        aliases = aliases.concat(artist.alia);
                    }
                    if (aliases.length > 0) {
                        aliasText.textContent = `别名: ${aliases.join(' / ')}`;
                    } else {
                        aliasText.style.display = 'none';
                    }

                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    // 显示专辑数量、单曲数量和MV数量
                    subtitle.textContent = `专辑: ${artist.albumSize} · 单曲: ${artist.musicSize} · MV: ${artist.mvSize || 0}`;

                    // 显示关注状态
                    let followStatus = document.createElement('div');
                    followStatus.className = 'result-follow-status';
                    followStatus.textContent = artist.followed ? '已关注' : '未关注';
                    followStatus.style.color = artist.followed ? '#4CAF50' : '#9E9E9E';

                    info.appendChild(title);
                    info.appendChild(aliasText);
                    info.appendChild(subtitle);
                    info.appendChild(followStatus);

                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">arrow_forward</i>';

                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 点击歌手条目跳转到歌手详情页面
                    item.addEventListener('click', () => {
                        window.location.href = `artist.html?id=${artist.id}`;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关歌手</div>';
            }
            break;
        case 1000: // 歌单
            if (result.playlists && result.playlists.length > 0) {
                result.playlists.forEach((playlist, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';

                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = playlist.coverImgUrl;

                    let info = document.createElement('div');
                    info.className = 'result-info';

                    let title = document.createElement('div');
                    title.className = 'result-title';
                    title.textContent = playlist.name;

                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    subtitle.textContent = `${playlist.creator.nickname} · ${playlist.trackCount}首 · ${playlist.playCount}次播放`;

                    info.appendChild(title);
                    info.appendChild(subtitle);

                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">arrow_forward</i>';

                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 点击歌单条目跳转到歌单详情页面
                    item.addEventListener('click', () => {
                        window.location.href = `playlist.html?id=${playlist.id}`;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关歌单</div>';
            }
            break;
        case 1002: // 用户
            if (result.userprofiles && result.userprofiles.length > 0) {
                result.userprofiles.forEach((user, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';

                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = user.avatarUrl;

                    let info = document.createElement('div');
                    info.className = 'result-info';

                    let title = document.createElement('div');
                    title.className = 'result-title';
                    title.textContent = user.nickname;

                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    subtitle.textContent = `粉丝: ${user.followeds} · 关注: ${user.follows} · 歌单: ${user.playlistCount}`;

                    info.appendChild(title);
                    info.appendChild(subtitle);

                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">arrow_forward</i>';

                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 点击用户条目跳转到用户个人主页
                    item.addEventListener('click', () => {
                        window.location.href = `user.html?uid=${user.userId}`;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关用户</div>';
            }
            break;
        case 1004: // MV
            if (result.mvs && result.mvs.length > 0) {
                result.mvs.forEach((mv, index) => {
                    let item = document.createElement('div');
                    item.className = 'result-item mdui-list-item mdui-ripple';

                    let cover = document.createElement('img');
                    cover.className = 'result-cover';
                    cover.src = mv.cover;

                    let info = document.createElement('div');
                    info.className = 'result-info';

                    let title = document.createElement('div');
                    title.className = 'result-title';
                    title.textContent = mv.name;

                    let subtitle = document.createElement('div');
                    subtitle.className = 'result-subtitle';
                    subtitle.textContent = `${mv.artistName} · ${formatDuration(mv.duration)} · ${formatPlayCount(mv.playCount)}次播放`;

                    info.appendChild(title);
                    info.appendChild(subtitle);

                    let action = document.createElement('div');
                    action.className = 'mdui-list-item-icon';
                    action.innerHTML = '<i class="mdui-icon material-icons mdui-text-color-primary">play_arrow</i>';

                    item.appendChild(cover);
                    item.appendChild(info);
                    item.appendChild(action);

                    // 点击MV条目跳转到MV播放页面
                    item.addEventListener('click', () => {
                        window.location.href = `mv.html?id=${mv.id}`;
                    });

                    searchResults.appendChild(item);
                });
            } else {
                searchResults.innerHTML = '<div class="mdui-center">未找到相关MV</div>';
            }
            break;
        default:
            searchResults.innerHTML = '<div class="mdui-center">暂不支持该搜索类型</div>';
    }
}

// 格式化日期
function formatDate(time) {
    let date = new Date(time);
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

// 格式化时长（毫秒转分:秒）
function formatDuration(duration) {
    // 转换为秒
    let seconds = Math.floor(duration / 1000);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// 格式化播放次数
function formatPlayCount(playCount) {
    if (playCount >= 100000000) {
        return `${(playCount / 100000000).toFixed(1)}亿`;
    } else if (playCount >= 10000) {
        return `${(playCount / 10000).toFixed(1)}万`;
    } else {
        return playCount.toString();
    }
}

// 初始化事件监听
function initEventListeners() {
    // 添加滚动监听，实现加载更多
    window.addEventListener('scroll', () => {
        let loadMoreBtn = document.getElementById('loadMoreBtn');
        // 检查是否滚动到底部
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            // 确保有搜索结果且不是首次加载
            if (searchResults.children.length > 0 && !document.querySelector('.mdui-spinner')) {
                // 显示加载更多按钮
                if (!loadMoreBtn) {
                    let btn = document.createElement('button');
                    btn.id = 'loadMoreBtn';
                    btn.className = 'mdui-btn mdui-btn-block mdui-m-y-4 mdui-color-primary mdui-ripple';
                    btn.textContent = '加载更多';
                    btn.addEventListener('click', loadMoreResults);
                    searchResults.insertAdjacentElement('afterend', btn);
                } else {
                    loadMoreBtn.style.display = 'block';
                }
            }
        } else if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    });

    // 加载更多结果
    function loadMoreResults() {
        currentPage++;
        performSearch(true);
    }
    // 搜索按钮点击事件
    searchIcon.addEventListener('click', performSearch);

    // 搜索输入框回车事件
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // 搜索输入框输入事件（搜索建议）
    searchInput.addEventListener('input', () => {
        debouncedGetSearchSuggestions(searchInput.value);
    });

    // 搜索输入框获取焦点事件（搜索建议）
    searchInput.addEventListener('focus', () => {
        getSearchSuggestions(searchInput.value);
    });

    // 点击页面其他地方关闭搜索建议
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.style.display = 'none';
        }
    });

    // 监听Tab切换事件
    document.querySelector('#searchTypeTabs').addEventListener('change.mdui.tab', (event) => {
        let index = event._detail.index;
        let tab = searchTabs[index];
        currentType = parseInt(tab.getAttribute('data-type'));
        currentPage = 1;
        // 如果不是单曲类型，清空歌曲 ID 数组
        if (currentType !== 1) {
            currentSongIds = [];
        }

        performSearch();
        // 移除加载更多按钮
        document.getElementById('loadMoreBtn')?.remove();
    });
}

// 初始化
function initSearch(keyword="") {
    initEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('s');
    if (searchParam) {
        keyword = searchParam;
    }

    // 初始隐藏加载更多按钮
    let loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'loadMoreBtn';
    loadMoreBtn.className = 'mdui-btn mdui-btn-block mdui-m-y-4 mdui-color-primary mdui-ripple';
    loadMoreBtn.textContent = '加载更多';
    loadMoreBtn.style.display = 'none';
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        performSearch(true);
    });
    searchResults.insertAdjacentElement('afterend', loadMoreBtn);
    getDefaultSearch();
    getHotSearch();

    let type = "1";

    // 如果有类型参数，设置当前搜索类型
    if (type) {
        let typeNum = parseInt(type);
        // 检查类型是否有效
        let validTypes = [1, 10, 100, 1000, 1002, 1004];
        if (validTypes.includes(typeNum)) {
            currentType = typeNum;
            // 更新Tab选中状态
            searchTabs.forEach(tab => {
                if (parseInt(tab.getAttribute('data-type')) === currentType) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }
    }

    // 如果有关键词参数，执行搜索
    if (keyword) {
        searchInput.value = keyword;
        performSearch();
    }
}

document.addEventListener('click', function (e) {
    if (
        searchSuggestions.style.display !== 'none' &&
        e.target !== searchInput &&
        !searchSuggestions.contains(e.target)
    ) {
        searchSuggestions.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    initSearch();
});
