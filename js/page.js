document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add("mdui-bottom-nav-fixed", "padding-bottom", "mdui-appbar-with-toolbar");

    // 检查URL参数，如果存在s参数则自动跳转到搜索页面
    const urlParams = new URLSearchParams(window.location.search);
    const searchKeyword = urlParams.get('s');
    if (searchKeyword) {
        // 延迟执行以确保DOM完全加载
        setTimeout(() => {
            // 自动跳转到搜索页面
            document.getElementById("s").classList.add("mdui-bottom-nav-active");
            document.getElementById("home").classList.remove("mdui-bottom-nav-active");
            searchPage();
            // 将搜索关键词填入搜索框
            if (document.getElementById("homeSearchInput")) {
                document.getElementById("homeSearchInput").value = searchKeyword;
            }
            // 触发搜索
            initSearch(searchKeyword);
        }, 100);
    }
});

function homePage() {
    document.getElementById("homepage").classList.add('active');
    document.getElementById("searchpage").classList.remove('active');
    document.getElementById("plpage").classList.remove('active');
    document.getElementById("setpage").classList.remove('active');
    document.getElementById("searchForm").style.display = 'block';
}

function searchPage() {
    document.getElementById("homepage").classList.remove('active');
    document.getElementById("searchpage").classList.add('active');
    document.getElementById("plpage").classList.remove('active');
    document.getElementById("setpage").classList.remove('active');

    document.getElementById("searchForm").style.display = 'none';
    initSearch(document.getElementById("homeSearchInput").value);
}

function plPage() {
    document.getElementById("homepage").classList.remove('active');
    document.getElementById("searchpage").classList.remove('active');
    document.getElementById("plpage").classList.add('active');
    document.getElementById("setpage").classList.remove('active');
    document.getElementById("searchForm").style.display = 'block';

    renderRecommendPl();
}

function setPage() {
    document.getElementById("homepage").classList.remove('active');
    document.getElementById("searchpage").classList.remove('active');
    document.getElementById("plpage").classList.remove('active');
    document.getElementById("setpage").classList.add('active');
    document.getElementById("searchForm").style.display = 'block';
}
