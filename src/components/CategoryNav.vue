<template>
  <aside class="category-nav">
    <div class="title">全部分区</div>
    <ul>
      <li
        v-for="c in categories"
        :key="c.id"
        :class="{ active: isActive(c.id), child: c.depth > 0 }"
        :style="{ paddingLeft: 16 + (c.depth || 0) * 14 + 'px' }"
        @click="select(c.id)"
      >
        <img v-if="c.iconUrl" class="icon" :src="c.iconUrl" alt="" loading="lazy" />
        <span v-else class="dot"></span>{{ c.name }}
      </li>
    </ul>
  </aside>
</template>

<script setup>
// categories 传的是「带 depth 的平铺列表」而不是嵌套树：
// 嵌套渲染要么只画一级、要么得递归组件，而平铺能保证后台新建的子分类一定出现在导航里
// ——后台禁用/新建的分类如果在消费端看不见，就等于没人能把它改回来。
const props = defineProps({
  categories: { type: Array, required: true },
  modelValue: { type: [Number, String], default: '' }
})
const emit = defineEmits(['update:modelValue', 'change'])

// 选中态从地址栏来，query 永远是字符串，而后端给的 id 是数字。
// 之前用 === 直接比，刷新页面/从 ?cat=3 进来时高亮总是丢，所以两边都转成字符串比。
function isActive(id) {
  return String(props.modelValue ?? '') === String(id)
}

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
  color: var(--vp-primary);
}
.category-nav li.active {
  color: var(--vp-primary);
  background: var(--vp-primary-light);
  font-weight: 600;
}
.icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
  flex-shrink: 0;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}
.child {
  font-size: 13px;
}
</style>
