<template>
  <div class="player">
    <video
      ref="videoEl"
      class="video"
      controls
      autoplay
      playsinline
      :poster="poster"
    ></video>
    <div v-if="error" class="error-tip">
      <el-alert type="error" :closable="false" :title="error" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Hls from 'hls.js'

const props = defineProps({
  src: { type: String, default: '' },
  poster: { type: String, default: '' }
})

const videoEl = ref(null)
const error = ref('')
let hls = null

function destroyHls() {
  if (hls) {
    hls.destroy()
    hls = null
  }
}

function load(src) {
  error.value = ''
  const video = videoEl.value
  if (!video || !src) return
  destroyHls()

  // 原生支持 HLS（Safari）直接播放 m3u8
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src
    return
  }
  // 其他浏览器用 hls.js
  if (Hls.isSupported()) {
    hls = new Hls({ lowLatencyMode: false })
    hls.loadSource(src)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        error.value = '视频加载失败：' + (data.details || '未知错误')
      }
    })
  } else {
    video.src = src
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
