<template>
	<footer class="site-foot">
		<div class="wrap inner">
			<span>In Stock, les prix et stocks relevés sur les boutiques en ligne.</span>
			<RouterLink :to="{ name: 'robot' }">Notre robot</RouterLink>
		</div>
	</footer>
</template>

<style scoped>
.site-foot {
	border-top: 1px solid var(--line);
	background: var(--surface);
	margin-top: auto;
}
.inner {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 20px;
	justify-content: space-between;
	padding-block: 18px;
	font-size: 13px;
	color: var(--ink-3);
}
</style>
