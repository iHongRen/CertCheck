<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	view,
	text,
	image,
	input,
	textarea {
		box-sizing: border-box;
	}
	
	body {
		-webkit-user-select: text;
		-ms-user-select: text;
		user-select: text;
	}
</style>
