<template>
<!--  <footer class="footer">-->
<!--    <span>订阅转换</span>-->
<!--    <span class="dot"></span>-->
<!--    <span>Production Docker image on GHCR</span>-->
<!--  </footer>-->
</template>

<style scoped>
.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 58px;
  padding: 16px;
  border-top: 1px solid rgba(135, 160, 185, 0.12);
  color: var(--text-muted);
  background: rgba(3, 6, 10, 0.72);
  font-size: 0.84rem;
  font-weight: 800;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

@media (max-width: 520px) {
  .footer {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
