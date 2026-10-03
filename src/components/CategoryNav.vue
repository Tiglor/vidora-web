<template>
  <aside class="category-nav">
    <div class="title">全部分区</div>
    <ul>
      <li
        v-for="c in categories"
        :key="c.id"
        :class="{ active: modelValue === c.id }"
        @click="select(c.id)"
      >
        <span class="dot"></span>{{ c.name }}
      </li>
    </ul>
  </aside>
</template>

<script setup>
const props = defineProps({
  categories: { type: Array, required: true },
  modelValue: { type: [Number, String], default: '' }
})
const emit = defineEmits(['update:modelValue', 'change'])

function select(id) {
  emit('update:modelValue', id)
  emit('change', id)
}
</script>

<style scoped>
.category-nav {
  width: 180px;
  background: var(--vp-card);
  border-radius: 10px;
  padding: 12px 0;
  flex-shrink: 0;
}
.title {
  padding: 4px 16px 10px;
  font-weight: 700;
  font-size: 15px;
  color: var(--vp-text);
}
.category-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.category-nav li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  cursor: pointer;
  color: var(--vp-text-2);
  font-size: 14px;
}
.category-nav li:hover {
  background: var(--vp-bg);
  color: var(--vp-pink);
}
.category-nav li.active {
  color: var(--vp-pink);
  background: #fff0f5;
  font-weight: 600;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
}
</style>
