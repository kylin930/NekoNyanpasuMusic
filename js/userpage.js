// 从URL获取用户ID
function getUserIdFromUrl() {
    let params = new URLSearchParams(window.location.search);
    return params.get('uid') || '32953014'; // 默认用户ID
}

// 格式化日期
function formatDate(time) {
    let date = new Date(time);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 获取用户详情
function getUserDetail(uid) {
    return fetchWithCookie(`/user/detail?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取用户VIP信息
function getUserVipInfo(uid) {
    return fetchWithCookie(`/vip/info?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取用户歌单
function getUserPlaylists(uid) {
    return fetchWithCookie(`/user/playlist?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取用户关注列表
function getUserFollows(uid) {
    return fetchWithCookie(`/user/follows?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取用户粉丝列表
function getUserFolloweds(uid) {
    return fetchWithCookie(`/user/followeds?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取用户动态
function getUserEvents(uid) {
    return fetchWithCookie(`/user/event?uid=${uid}`)
        .then(response => response.json())
        .then(data => data);
}

// 渲染用户详情
function renderUserDetail(userDetail) {
    let user = userDetail.profile;
    document.getElementById('userHeader').style.backgroundImage = `url(${user.backgroundUrl})`;
    document.getElementById('userAvatar').src = user.avatarUrl;
    document.getElementById('nicknameText').textContent = user.nickname;
    document.getElementById('userSignature').textContent = user.signature || '暂无签名';
    document.getElementById('followedsCount').textContent = user.followeds;
    document.getElementById('followsCount').textContent = user.follows;
    document.getElementById('playlistCount').textContent = userDetail.playlistCount;
    document.getElementById('listenSongsCount').textContent = userDetail.listenSongs;

    // 显示VIP标识
    if (user.vipType > 0) {
        // 获取VIP信息
        getUserVipInfo(user.userId)
            .then(vipInfo => {
                if (vipInfo.code === 200 && vipInfo.data) {
                    let vipLevel = vipInfo.data.redVipLevel || 1;
                    let vipIcons = {
                        1: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582186486/9f31/5cfe/207c/2846c11ce0bd05aae1754aed7e63ca58.png',
                        2: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582188103/1854/6c02/1504/df5815d7c9784ad27e150a951f70ec39.png',
                        3: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582188099/3419/2b65/d241/bd664461c263a2dfdbf631bb9848ee3e.png',
                        4: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582187192/1052/507f/a9f6/37b6f5c7730daf96a992accb35092511.png',
                        5: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582188100/ca7f/f3f7/f591/a142a567c050a4a860ee77765270db57.png',
                        6: 'https://p5.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582187196/ecde/1b79/d752/ec1b8f20854d06bba52ed022d28871d6.png',
                        7: 'https://p6.music.126.net/obj/wonDlsKUwrLClGjCm8Kx/32582185437/838c/3e35/26c7/1483dd70f2bbbf601f095dff56c603b8.png'
                    };
                    let iconUrl = vipIcons[vipLevel > 7 ? 7 : vipLevel] || vipIcons[1];
                    document.getElementById('vipBadge').src = iconUrl;
                    document.getElementById('vipBadge').style.display = 'inline-block';
                    document.getElementById('vipBadge').style.height = '24px';
                    document.getElementById('vipBadge').style.width = '72px';
                } else {
                    document.getElementById('vipBadge').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('获取VIP信息失败:', error);
                document.getElementById('vipBadge').style.display = 'none';
            });
    } else {
        document.getElementById('vipBadge').style.display = 'none';
    }

    // 渲染详情页信息
    document.getElementById('userLevel').textContent = `等级 ${userDetail.level}`;
    // 动态设置页面标题
    document.title = `${userDetail.profile.nickname} - NekoMusic`;
    document.getElementById('registerTime').textContent = formatDate(userDetail.createTime);
    document.getElementById('userLocation').textContent = `${user.province || ''} ${user.city || ''}`.trim() || '未知';
    document.getElementById('userDescription').textContent = user.detailDescription || '暂无介绍';

    // 简单模拟最近播放歌曲
    //renderRecentSongs();
}

// 渲染最近播放歌曲（模拟数据）
// function renderRecentSongs() {
//     let recentSongsContainer = document.getElementById('recentSongs');
//     // 这里使用模拟数据，实际应用中应该从API获取
//     let mockSongs = [
//         { name: 'Cold', artist: 'Chris Stapleton', album: 'Cold' },
//         { name: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' },
//         { name: 'Dance Monkey', artist: 'Tones And I', album: 'The Kids Are Coming' }
//     ];

//     let html = '';
//     mockSongs.forEach((song, index) => {
//         html += `
//         <div class="mdui-row song-item">
//             <div class="mdui-col-xs-1">
//                 <span class="mdui-text-color-gray-500">${index + 1}</span>
//             </div>
//             <div class="mdui-col-xs-6">
//                 <p class="mdui-text-truncate">${song.name}</p>
//                 <p class="mdui-text-color-gray-500 mdui-text-sm">${song.artist}</p>
//             </div>
//             <div class="mdui-col-xs-4 mdui-text-right mdui-text-color-gray-500">
//                 <span class="mdui-text-sm">${song.album}</span>
//             </div>
//             <div class="mdui-col-xs-1 mdui-text-right">
//                 <button class="mdui-btn mdui-btn-icon mdui-text-color-gray-400"><i class="mdui-icon material-icons">play_arrow</i></button>
//             </div>
//         </div>
//         `;
//     });

//     recentSongsContainer.innerHTML = html;
// }

// 渲染用户歌单
function renderUserPlaylists(playlists) {
    let playlistsContainer = document.getElementById('userPlaylists');
    let html = '';

    playlists.forEach(playlist => {
        html += `
        <div class="mdui-row playlist-item mdui-hoverable" onclick="window.location.href='playlist.html?id=${playlist.id}'">
            <div class="mdui-col-xs-3 mdui-col-sm-2">
                <img src="${playlist.coverImgUrl}?param=120x120" alt="${playlist.name}" class="playlist-cover">
            </div>
            <div class="mdui-col-xs-9 mdui-col-sm-10">
                <h3 class="mdui-text-subtitle-1 mdui-text-truncate">${playlist.name}</h3>
                <p class="mdui-text-color-gray-600 mdui-text-sm">${playlist.trackCount}首歌曲 · ${formatPlayCount(playlist.playCount)}次播放</p>
                ${playlist.description ? `<p class="mdui-text-sm mdui-m-t-1">${playlist.description}</p>` : ''}
                <button class="mdui-btn mdui-btn-outlined mdui-ripple mdui-m-t-1" onclick="window.location.href='playlist.html?id=${playlist.id}'">查看歌单</button>
            </div>
        </div>
        `;
    });

    playlistsContainer.innerHTML = html || '<p class="mdui-text-center mdui-text-color-gray-500 mdui-m-t-4">该用户暂无歌单</p>';
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

// 渲染用户关注列表
function renderUserFollows(follows) {
    let followsContainer = document.getElementById('userFollows');
    let html = '';

    follows.forEach(user => {
        html += `
        <div class="mdui-card user-card mdui-hoverable">
            <div class="mdui-card-content">
                <div class="mdui-row">
                    <div class="mdui-col-xs-3 mdui-col-sm-2">
                        <img src="${user.avatarUrl}?param=80x80" alt="${user.nickname}" class="mdui-img-circle">
                    </div>
                    <div class="mdui-col-xs-6 mdui-col-sm-7">
                        <h3 class="mdui-text-subtitle-1">${user.nickname}</h3>
                        <p class="mdui-text-color-gray-600 mdui-text-sm">${user.signature || '暂无签名'}</p>
                    </div>
                    <div class="mdui-col-xs-3 mdui-col-sm-3 mdui-text-right">
                        <button class="mdui-btn mdui-btn-outlined mdui-ripple" onclick="window.location.href='user.html?uid=${user.userId}'">查看</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    followsContainer.innerHTML = html || '<p class="mdui-text-center mdui-text-color-gray-500 mdui-m-t-4">该用户暂无关注</p>';
}

// 渲染用户粉丝列表
function renderUserFolloweds(followeds) {
    let followedsContainer = document.getElementById('userFolloweds');
    let html = '';

    followeds.forEach(user => {
        html += `
        <div class="mdui-card user-card mdui-hoverable">
            <div class="mdui-card-content">
                <div class="mdui-row">
                    <div class="mdui-col-xs-3 mdui-col-sm-2">
                        <img src="${user.avatarUrl}?param=80x80" alt="${user.nickname}" class="mdui-img-circle">
                    </div>
                    <div class="mdui-col-xs-6 mdui-col-sm-7">
                        <h3 class="mdui-text-subtitle-1">${user.nickname}</h3>
                        <p class="mdui-text-color-gray-600 mdui-text-sm">${user.signature || '暂无签名'}</p>
                    </div>
                    <div class="mdui-col-xs-3 mdui-col-sm-3 mdui-text-right">
                        <button class="mdui-btn mdui-btn-outlined mdui-ripple" onclick="window.location.href='user.html?uid=${user.userId}'">查看</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    followedsContainer.innerHTML = html || '<p class="mdui-text-center mdui-text-color-gray-500 mdui-m-t-4">该用户暂无粉丝</p>';
}

// 渲染用户动态
function renderUserEvents(events) {
    let eventsContainer = document.getElementById('userEvents');
    let html = '';

    events.forEach(event => {
        // 解析动态内容
        let eventContent = '';
        try {
            let json = JSON.parse(event.json);
            if (json.msg) {
                eventContent += `<p>${json.msg}</p>`;
            }
            if (json.song) {
                eventContent += `
                <div class="mdui-card mdui-m-t-2">
                    <div class="mdui-card-content">
                        <div class="mdui-row">
                            <div class="mdui-col-xs-2">
                                <img src="${json.song.al.picUrl}?param=60x60" alt="${json.song.name}" class="mdui-img-rounded">
                            </div>
                            <div class="mdui-col-xs-10">
                                <p class="mdui-text-truncate">${json.song.name}</p>
                                <p class="mdui-text-color-gray-600 mdui-text-sm">${json.song.ar[0].name}</p>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }
        } catch (e) {
            eventContent = '<p>无法解析动态内容</p>';
        }

        html += `
        <div class="event-item">
            <div class="mdui-row">
                <div class="mdui-col-xs-2">
                    <img src="${event.user.avatarUrl}?param=60x60" alt="${event.user.nickname}" class="mdui-img-circle">
                </div>
                <div class="mdui-col-xs-10">
                    <div class="mdui-row">
                        <div class="mdui-col-xs-8">
                            <h3 class="mdui-text-subtitle-1">${event.user.nickname}</h3>
                        </div>
                        <div class="mdui-col-xs-4 mdui-text-right event-time">
                            ${formatDate(event.eventTime)}
                        </div>
                    </div>
                    <div class="event-content">
                        ${eventContent}
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    eventsContainer.innerHTML = html || '<p class="mdui-text-center mdui-text-color-gray-500 mdui-m-t-4">该用户暂无动态</p>';
}

// MDUI选项卡已通过mdui-tab属性自动初始化，无需手动实现切换逻辑

// 初始化页面
function init() {
    let uid = getUserIdFromUrl();

    // 标签页已通过mdui-tab属性自动初始化

    // 加载用户数据
    // 先获取用户详情，然后根据需要获取VIP信息
    getUserDetail(uid)
        .then(userDetail => {
            renderUserDetail(userDetail);
            
            // 并行获取其他数据
            return Promise.all([
                getUserPlaylists(uid),
                getUserFollows(uid),
                getUserFolloweds(uid),
                getUserEvents(uid)
            ]);
        }).then(([playlists, follows, followeds, events]) => {
            renderUserPlaylists(playlists.playlist || []);
            renderUserFollows(follows.follow || []);
            renderUserFolloweds(followeds.followeds || []);
            renderUserEvents(events.events || []);
        }).catch(error => {
        console.error('加载用户数据失败:', error);
        mdui.snackbar({ message: '加载用户数据失败' });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    init();
    ThemeManager.initTheme();
});
