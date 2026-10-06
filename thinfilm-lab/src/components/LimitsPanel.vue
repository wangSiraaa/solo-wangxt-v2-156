<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>

<template>
  <section class="panel">
    <h2 @click="open = !open" class="toggle">
      模型能力与边界（务必阅读） {{ open ? '▾' : '▸' }}
    </h2>
    <ul v-if="open" class="limits">
      <li><b>理想模型</b>：平面波、无限大平行平面界面、各向同性均匀膜层、突变界面。
        不包含表面粗糙度、膜厚不均匀、散射、梯度折射率、应力双折射。</li>
      <li><b>相干模型</b>：假设所有膜层完全相干；基底视为半无限（只算单个界面的透射，
        不含基底背面的二次反射与厚基底的非相干叠加）。与实测光谱仪对厚基底的非相干平均结果会有差异。</li>
      <li><b>材料数据</b>：内置 n、κ 表为教学示例数据（文献量级），线性插值，超出范围取端点并显式警告，
        <b>不代表任何实际镀膜批次</b>。真实膜料的光学常数依赖制备工艺，须实测拟合。</li>
      <li><b>能量守恒</b>：无损膜系 R+T=1 在数值精度内成立（本页实时显示残差）；
        含吸收介质时 A=1−R−T&gt;0，<b>不强制 R+T=1</b>。半无限吸收基底的情形：T 是进入基底的能流，
        最终在基底内耗散，故无损膜+吸收基底仍有 R+T=1。</li>
      <li><b>角度边界</b>：θ→90° 时 R_s、R_p→1，θ=90° 本身模型奇异（入射/反射方向与界面平行），程序拒绝计算。</li>
      <li><b>偏振</b>：s/p 分量分别按 Fresnel 导纳计算；非偏振光 ≈ (s+p)/2 的假设仅在正入射附近成立，本程序不擅自平均。</li>
      <li><b>结果性质</b>：所有谱线为<b>模型计算结果</b>，用于理解干涉原理与膜系设计方法，
        不能冒充实物镀膜的测量或验收数据。</li>
    </ul>
  </section>
</template>

<style scoped>
.toggle { cursor: pointer; }
.limits { font-size: 13px; line-height: 1.7; padding-left: 18px; }
.limits li { margin-bottom: 6px; }
</style>
