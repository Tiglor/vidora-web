<template>
  <div class="player">
    <video
      ref="videoEl"
      class="video"
      controls
      autoplay
      playsinline
      :poster="poster"
      @error="onMediaError"
    ></video>
    <div v-if="error" class="error-tip">
      <el-alert type="error" :closable="false" :title="error" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  poster: { type: String, default: '' }
})

const videoEl = ref(null)
const error = ref('')
let hls = null
// hls.js 改成按需动态加载后，load 变成异步的：src 连着变两次时，
// 先发出的那次解析回来不能再往新的 video 上 attach，用序号丢掉过期结果
let loadSeq = 0

function destroyHls() {
  if (hls) {
    hls.destroy()
    hls = null
  }
}

// 后端 getPlayUrl 没转码时回的是源文件地址（mp4），喂给 hls.js 解析必失败
function isHlsSource(src) {
  return /\.m3u8(\?|$)/i.test(src)
}

// 原生 <video> 加载失败（404、域名解析不了、编码不支持）时只剩一块点不动的黑屏，
// 这里补一句人话。走 hls.js 时它有自己的 ERROR 事件，不在这里重复报。
function onMediaError() {
  if (hls || !props.src) return
  error.value = '视频加载失败，播放地址可能已失效'
}

async function load(src) {
  const seq = ++loadSeq
  error.value = ''
  destroyHls()
  const video = videoEl.value
  if (!video || !src) return

  // 非 HLS，或浏览器原生支持 HLS（Safari）：交给 <video> 自己放
  if (!isHlsSource(src) || video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src
    return
  }

  try {
    // 只有真的需要 HLS 时才拉这个 chunk（约 590KB）
    const { default: Hls } = await import('hls.js')
    if (seq !== loadSeq || !videoEl.value) return
    if (!Hls.isSupported()) {
      video.src = src
      return
    }
    hls = new Hls({ lowLatencyMode: false })
    hls.loadSource(src)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        error.value = '视频加载失败：' + (data.details || '未知错误')
      }
    })
  } catch (e) {
    video.src = src
    error.value = '播放器组件加载失败，已退回原生播放'
  }
}

onMounted(() => load(props.src))
watch(() => props.src, (v) => load(v))
onBeforeUnmount(() => destroyHls())
</script>

<style scoped>
.player {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.video {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}
.error-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 20px;
}
</style>
