<template>
  <div class="comment-list">
    <div class="comment-box">
      <el-avatar :size="36" :src="avatarUrl">{{ (nickname || 'U').charAt(0) }}</el-avatar>
      <div class="box-main">
        <el-input
          v-model="text"
          type="textarea"
          :rows="2"
          placeholder="发一条友善的评论"
          maxlength="200"
          show-word-limit
        />
        <div class="box-actions">
          <el-button type="primary" size="small" :disabled="!text.trim()" @click="submit">
            发布
          </el-button>
        </div>
      </div>
    </div>

    <div class="count">{{ comments.length }} 条评论</div>
    <ul class="list">
      <li v-for="c in comments" :key="c.id">
        <el-avatar :size="34">{{ (c.userName || 'U').charAt(0) }}</el-avatar>
        <div class="item-main">
          <div class="name">{{ c.userName || '匿名用户' }}</div>
          <div class="content">{{ c.content }}</div>
          <div class="time">{{ formatTime(c.createTime) }}</div>
        </div>
      </li>
      <li v-if="comments.length === 0" class="empty">暂无评论，快来抢沙发~</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  comments: { type: Array, default: () => [] },
  nickname: { type: String, default: '' },
  avatarUrl: { type: String, default: '' }
})
const emit = defineEmits(['submit'])
const text = ref('')

// 后端给的是 LocalDateTime 的 JSON 串（2026-10-02T18:20:00），
// 与详情页「发布时间」保持同一种形状：去掉 T、截到分钟
function formatTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : ''
}

function submit() {
  const t = text.value.trim()
  if (!t) return
  emit('submit', t)
  text.value = ''
}
</script>

<style scoped>
.comment-box {
  display: flex;
  gap: 10px;
}
.box-main {
  flex: 1;
}
.box-actions {
  text-align: right;
  margin-top: 6px;
}
.count {
  margin: 16px 0 8px;
  font-weight: 600;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list li {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-border);
}
.item-main {
  flex: 1;
}
.name {
  color: var(--vp-text-2);
  font-size: 13px;
}
.content {
  margin: 4px 0;
  line-height: 1.5;
}
.time {
  color: var(--vp-text-2);
  font-size: 12px;
}
.empty {
  color: var(--vp-text-2);
  text-align: center;
  padding: 24px 0;
}
</style>
