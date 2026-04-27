// 带 Cookie 的 fetch：优先使用 localStorage 中的 cookie
function fetchWithCookie(url, options = {}) {
    const cookie = localStorage.getItem('user_cookie');
    const headers = { ...(options.headers || {}) };
    if (cookie && !url.includes("https://api.qijieya.cn")) {
        headers['X-Cookie'] = cookie; // 自定义头，浏览器不限制
    }
    let workerUrl;

    const a = url.includes("https://163api.ciallo.uk");
    if (a) {
        workerUrl = url;
    } else if (url.includes("https://api.qijieya.cn")) {
        workerUrl = url;
    } else {
        workerUrl = "https://163api.ciallo.uk"+url;
    }

    return fetch(workerUrl, { ...options, headers });
}

// 主题管理模块
let ThemeManager = {
    // 初始化主题
    initTheme: function() {
        let themeColor = localStorage.getItem('theme-color') || 'indigo';
        let accentColor = localStorage.getItem('accent-color') || 'pink';
        let themeMode = localStorage.getItem('theme-mode') || 'light';

        // 更新主题色和强调色
        document.body.className = `mdui-theme-primary-${themeColor} mdui-theme-accent-${accentColor}`;

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
    },

    // 初始化设置事件监听
    initSettingsListeners: function() {
        // 监听主题更新事件
        window.addEventListener('themeUpdated', this.initTheme.bind(this));

        // 页面加载完成后初始化主题
        document.addEventListener('DOMContentLoaded', this.initTheme.bind(this));
    },

    // 获取API基础URL（确保末尾没有斜杠）
    getApiBaseUrl: function() {
        let baseUrl = localStorage.getItem('api-base-url') || 'https://163api.ciallo.uk/';
        // 移除末尾可能存在的斜杠
        //return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return baseUrl;
    },

    // 获取音乐音质设置
    getMusicQuality: function() {
        return localStorage.getItem('music-quality') || 'exhigh';
    },

    // 获取VIP音乐解析开关状态
    isVipParseEnabled: function() {
        return localStorage.getItem('vip-parse-enabled') === 'true' || true;
    }
};

// 导出主题管理模块
if (typeof module !== 'undefined') {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
    // 自动初始化
    ThemeManager.initSettingsListeners();
}
