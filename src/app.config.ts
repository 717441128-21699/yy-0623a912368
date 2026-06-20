export default defineAppConfig({
  pages: [
    'pages/select/index',
    'pages/adjust/index',
    'pages/play/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#FF7A45',
    navigationBarTitleText: '家庭听书',
    navigationBarTextStyle: 'white',
    backgroundColor: '#FFF5F0'
  },
  tabBar: {
    color: '#8C8C8C',
    selectedColor: '#FF7A45',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/select/index',
        text: '选文'
      },
      {
        pagePath: 'pages/adjust/index',
        text: '调声'
      },
      {
        pagePath: 'pages/play/index',
        text: '播放'
      }
    ]
  }
})
