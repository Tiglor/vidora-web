<template>
  <div class="auth">
    <div class="auth-card">
      <h2>注册 微视频</h2>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="展示名称" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-button class="btn-pink submit" :loading="loading" @click="doRegister">注册</el-button>
      </el-form>
      <div class="foot">
        已有账号？<router-link to="/login">去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ phone: '', nickname: '', password: '' })
const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function doRegister() {
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.register(form.phone, form.password, form.nickname)
    ElMessage.success('注册成功，请登录')
    router.replace('/login')
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
