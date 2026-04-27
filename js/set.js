// 侧边栏切换
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function() {
        // 移除所有active类
        document.querySelectorAll('.sidebar-item').forEach(sidebarItem => {
            sidebarItem.classList.remove('active');
        });
        // 添加active类到当前项
        this.classList.add('active');
        // 隐藏所有设置内容
        document.querySelectorAll('.setting-content').forEach(content => {
            content.style.display = 'none';
        });
        // 显示对应内容
        let target = this.dataset.target;
        document.getElementById(`${target}-settings`).style.display = 'block';
    });
});

// 主题色切换
document.querySelectorAll('input[name="primary-color"]').forEach(radio => {
    radio.addEventListener('change', function() {
        // 保存到localStorage
        localStorage.setItem('theme-color', this.value);
        // 更新主题
        updateTheme();
    });
});

// 强调色切换
document.querySelectorAll('input[name="accent-color"]').forEach(radio => {
    radio.addEventListener('change', function() {
        // 保存到localStorage
        localStorage.setItem('accent-color', this.value);
        // 更新主题
        updateTheme();
    });
});

// 暗色模式切换
document.querySelectorAll('input[name="theme-mode"]').forEach(radio => {
    radio.addEventListener('change', function() {
        // 保存到localStorage
        localStorage.setItem('theme-mode', this.value);
        // 更新主题
        updateTheme();
    });
});

// API源设置
let apiBaseUrlInput = document.getElementById('api-base-url');
apiBaseUrlInput.addEventListener('change', function() {
    localStorage.setItem('api-base-url', this.value);
    // 同步更新ThemeManager
    if (window.ThemeManager && ThemeManager.setApiBaseUrl) {
        ThemeManager.setApiBaseUrl(this.value);
    }
});

// VIP音乐解析开关
let vipParseSwitch = document.getElementById('vip解析开关');
vipParseSwitch.addEventListener('change', function() {
    localStorage.setItem('vip-parse-enabled', this.checked);
});

// VIP音乐解析API地址
// let vipApiUrlSelect = document.getElementById('vip-api-url-select');
// vipApiUrlSelect.addEventListener('change', function() {
//     localStorage.setItem('vip-api-url', this.value);
// });

// 音乐音质设置
let musicQualitySelect = document.getElementById('music-quality');
musicQualitySelect.addEventListener('change', function() {
    localStorage.setItem('music-quality', this.value);
});

// 初始化设置
function initSettings() {
    // 主题色
    let savedThemeColor = localStorage.getItem('theme-color') || 'indigo';
    document.querySelector(`input[name="primary-color"][value="${savedThemeColor}"]`).checked = true;

    // 强调色
    let savedAccentColor = localStorage.getItem('accent-color') || 'pink';
    document.querySelector(`input[name="accent-color"][value="${savedAccentColor}"]`).checked = true;

    // 暗色模式
    let savedThemeMode = localStorage.getItem('theme-mode') || 'light';
    document.querySelector(`input[name="theme-mode"][value="${savedThemeMode}"]`).checked = true;

    // API源
    let savedApiBaseUrl = localStorage.getItem('api-base-url') || ThemeManager.getApiBaseUrl();
    apiBaseUrlInput.value = savedApiBaseUrl;
    // 确保ThemeManager使用最新的API地址
    if (window.ThemeManager && ThemeManager.setApiBaseUrl) {
        ThemeManager.setApiBaseUrl(savedApiBaseUrl);
    }

    // VIP音乐解析
    let savedVipParseEnabled = localStorage.getItem('vip-parse-enabled') === 'true' || true;
    vipParseSwitch.checked = savedVipParseEnabled;

    // VIP音乐解析API地址
    let savedVipApiUrl = localStorage.getItem('vip-api-url') || 'https://api.qijieya.cn/';
    document.getElementById('vip-api-url-select').value = savedVipApiUrl;

    // 音乐音质
    let savedMusicQuality = localStorage.getItem('music-quality') || 'exhigh';
    musicQualitySelect.value = savedMusicQuality;

    // 更新主题
    updateTheme();
}

// 更新主题
function updateTheme() {
    let themeColor = localStorage.getItem('theme-color') || 'indigo';
    let accentColor = localStorage.getItem('accent-color') || 'pink';
    let themeMode = localStorage.getItem('theme-mode') || 'light';

    // 更新主题色和强调色
    document.body.className = `mdui-theme-primary-${themeColor} mdui-theme-accent-${accentColor}`;
    document.body.classList.add("mdui-bottom-nav-fixed", "padding-bottom", "mdui-appbar-with-toolbar");

    // 更新暗色模式
    if (themeMode === 'dark') {
        document.body.classList.add('mdui-theme-layout-dark');
    } else if (themeMode === 'light') {
        document.body.classList.remove('mdui-theme-layout-dark');
    } else if (themeMode === 'system') {
        // 检查系统是否为暗色模式
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('mdui-theme-layout-dark');
        } else {
            document.body.classList.remove('mdui-theme-layout-dark');
        }
    }

    // 通知其他页面主题已更新
    window.dispatchEvent(new Event('themeUpdated'));
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initSettings();
});
