<template>
  <router-link :to="`/video/${video.id}`" class="video-card">
    <div class="cover">
      <img :src="cover" :alt="video.title" loading="lazy" />
      <span v-if="durationText" class="duration">{{ durationText }}</span>
      <span v-if="video.status !== 3" class="badge">转码中</span>
    </div>
    <div class="info">
      <div class="title text-2-line">{{ video.title }}</div>
      <div class="meta">
        <span>{{ video.playCount || 0 }} 播放</span>
        <span v-if="video.likeCount">· {{ video.likeCount }} 赞</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  video: { type: Object, required: true }
})

const cover = computed(() => props.video.coverUrl || '/default-cover.svg')

const durationText = computed(() => {
  const s = props.video.duration
  if (!s || s <= 0) return ''
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
})
</script>

<style scoped>
.video-card {
  display: block;
  background: var(--vp-card);
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.video-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}
.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #e9ebed;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.duration,
.badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
}
.badge {
  background: var(--vp-pink);
}
.info {
  padding: 8px 10px 10px;
}
.title {
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
  height: 2.8em;
}
.meta {
  margin-top: 6px;
  color: var(--vp-text-2);
  font-size: 12px;
  display: flex;
  gap: 8px;
}
</style>
