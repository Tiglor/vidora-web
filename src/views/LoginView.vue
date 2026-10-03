<template>
  <div class="auth">
    <div class="auth-card">
      <h2>登录 微视频</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" @keyup.enter="doLogin" />
        </el-form-item>
        <el-button class="btn-pink submit" :loading="loading" @click="doLogin">登录</el-button>
      </el-form>
      <div class="foot">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ phone: '', password: '' })
const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function doLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    const vo = await userStore.login(form.phone, form.password)
    ElMessage.success(`欢迎回来，${vo.nickname || '用户'}`)
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } catch (e) {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.auth-card {
  width: 360px;
  background: var(--vp-card);
  border-radius: 12px;
  padding: 28px 26px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}
.auth-card h2 {
  margin: 0 0 20px;
  text-align: center;
  color: var(--vp-pink);
}
.submit {
  width: 100%;
  color: #fff;
}
.foot {
  text-align: center;
  margin-top: 14px;
  color: var(--vp-text-2);
}
</style>
