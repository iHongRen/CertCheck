<template>
	<view class="flex-row-center navbar">
		<text>TLS证书过期检查</text>
		<view class="add-btn" @click="onAdd">+</view>
	</view>
	<view class="uni-container">
		<uni-table ref="table" :loading="loading" border stripe emptyText="暂无更多数据">
			<uni-tr>
				<uni-th width="20" align="center"></uni-th>
				<uni-th width="500" align="center">主机：端口</uni-th>
				<uni-th width="300" align="center">有效时间</uni-th>
				<uni-th align="center" sortable @sort-change="onSortChanged">剩余有效天数</uni-th>
				<uni-th width="250" align="center">操作</uni-th>
			</uni-tr>
			<uni-tr v-for="(item, index) in list" :key="item.host + item.port">
				<uni-td align="center">{{ index + 1 }}</uni-td>
				<uni-td>
                    <view class="host">
                        <view class="enable-dot" :class="{willDisable: item.expiredDay <= 15, disable: item.expiredDay <= 0}"></view>
                       <view class="host-port">{{ `${item.host}: ${item.port}` }}</view>
                    </view>
                    <view class="intro" v-if="item.intro">{{ `${item.intro}` }}</view>
				</uni-td>
				<uni-td align="center">
					<view class="name">{{ item.detail&&item.detail.valid_from ? `${validDate(item.detail.valid_from)}  -  ${validDate(item.detail.valid_to)}` : '' }}
					</view>
				</uni-td>
				<uni-td align="center">
					<view v-if="item.expired!=Number.MIN_VALUE">{{ item.expiredDay }}</view>
					<view class="will-expired-text" :class="{ expiredText: item.expiredDay <= 0 }"
						v-if="item.expired!=Number.MIN_VALUE && item.expiredDay < 15">{{ item.expiredDay <= 0 ? '已过期' : '即将到期' }}</view>
				</uni-td>
				<uni-td>
					<view class="uni-group">
						<button class="uni-button" size="mini" type="default" @click="onDetail(item.detail)">
							详细
						</button>
						<button class="uni-button" size="mini" type="primary" @click="onUpdate(item)">更新</button>
						<button class="uni-button" size="mini" type="warn" @click="onDelete(item)">删除</button>
					</view>
				</uni-td>
			</uni-tr>
		</uni-table>
	</view>
	<uni-popup ref="detailPopup" type="center" :animation="false">
		<view class="detail-popup">
			<pre>{{ detail }}</pre>
		</view>
	</uni-popup>
	<uni-popup ref="addPopup" type="center" :animation="false">
		<view class="add-popup">
			<form @submit="onFormSubmit">
				<view class="add-header" align="center">添加</view>
				<view class="flex-row-center add-item">
					<view>主机</view>
					<input class="add-input" placeholder="www.baidu.com(必填)"
						placeholder-style="color:#cccccc" name="host" />
				</view>
				<view class="flex-row-center add-item">
					<view>端口</view>
					<input class="add-input" type="number" placeholder="默认端口号:443" placeholder-style="color:#cccccc"
						name="port" />
				</view>
				<view class="flex-row-center add-item">
					<view>简介</view>
					<input class="add-input" placeholder="域名简介" placeholder-style="color:#cccccc" name="intro" />
				</view>
				<view class="flex-row-center add-item">
					<button class="uni-button" type="default" @click="onCancelAdd()">取消</button>
					<button class="uni-button" type="primary" form-type="submit">添加</button>
				</view>
			</form>
		</view>
	</uni-popup>
</template>

<script>
	import Api from './Api.js'

	export default {
		data() {
			return {
				loading: false,
				list: [],
				detail: '',
				sort: null
			}
		},
		computed: {},

		onLoad() {
			this.loadData()
		},

		methods: {
			async loadData() {
				this.loading = true
				const res = await Api.queryAll().catch((err) => {
                    this.loading = false
					this.alert(err.message)
				})
				if (res) {
					console.log(res)

					res.forEach((e) => {
                        e.expiredDay = this.getExpiredDay(e.expired)
					})

					this.configData(res)
				}
                this.loading = false
			},

			configData(list) {
				if (this.sort) {
					list = list.sort((e1, e2) => {
						if (this.sort == 'ascending') {
							return e1.expired - e2.expired
						}
						return e2.expired - e1.expired
					})
				}
				this.list = list
			},

			onAdd() {
				this.$refs.addPopup.open()
			},

			onDetail(e) {
				this.detail = JSON.stringify(e, null, 4)
				console.log(this.detail)
				this.$refs.detailPopup.open()
			},

			async onUpdate(item) {
				const { host, port } = item;
				await Api.updateDomain({ host, port })
				this.loadData()
			},

			onDelete(item) {
				uni.showModal({
					title: '删除提示',
					content: '确定要删除？',
					success: (res) => {
						if (res.confirm) {
							this.onDeleteConfirm(item)
						}
					}
				})
			},

			async onDeleteConfirm({ host, port }) {
				await Api.deleteDomain({ host, port })
				this.loadData()
			},

			onCancelAdd() {
				this.$refs.addPopup.close()
			},

			async onFormSubmit(e) {
				const { host, port, intro } = e.detail.value
				if (host) {
					await Api.addDomain({ host, port, intro })
					this.loadData()
					this.$refs.addPopup.close()
				} else {
					uni.showToast({
						title: '请填写主机名'
					})
				}
			},

			onSortChanged({ order }) {
				this.sort = order
				this.configData(this.list)
			},



			getExpiredDay(expired) {
				const nowTime = new Date().getTime() // 今天
				const nTime = expired - nowTime
				const day = Math.floor(nTime / 86400000) //天数差
				return day
			},

			validDate(date) {
				let d = new Date(Date.parse(date))
				return this.dateFormat(d, 'yyyy-MM-dd')
			},

			dateFormat(date, fmt) {
				let ret
				const opt = {
					'y+': date.getFullYear().toString(), // 年
					'M+': (date.getMonth() + 1).toString(), // 月
					'd+': date.getDate().toString() // 日
				}
				for (let k in opt) {
					ret = new RegExp('(' + k + ')').exec(fmt)
					if (ret) {
						fmt = fmt.replace(ret[1], ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, '0'))
					}
				}
				return fmt
			},

			alert(msg = '发生错误') {
				uni.showModal({
					content: msg
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.flex-row-center {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.navbar {
		justify-content: space-between;
		width: 100%;
		height: 120rpx;
		padding: 0 30rpx;
		background-color: #007aff;
		color: #ffffff;
		font-size: 40rpx;

		.add-btn {
			font-size: 70rpx;
		}
	}

	.content-view {
		display: flex;
		flex-direction: column;
		padding: 30rpx;
	}

	.uni-group {
		display: flex;
		align-items: center;
	}
    
    .host {
        display: flex;
        flex-direction: row;
        align-items: center;
        
        .enable-dot {
            background-color: limegreen;
            width: 20rpx;
            height: 20rpx;
            border-radius: 10rpx;
            margin-right: 8rpx;
        }
        
        .willDisable {
            background-color: #ff8c00;
        }
        
        .disable {
            background-color: #e64340;
        }
        
        .host-port {
        	color: #444444;
        	font-size: 32rpx;
        }
    }
	

	.intro {
		color: #999999;
		font-size: 20rpx;
	}

	.expiredText {
		color: #e64340;
	}

	.will-expired-text {
		color: #ff8c00;
	}

	.add-popup {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 30rpx;
		color: #333333;
		font-size: 40rpx;

		.add-item {
			margin-top: 30rpx;
		}

		.add-input {
			background-color: #f0f0f0;
			margin-left: 30rpx;
			padding: 20rpx;
			border-radius: 6rpx;
			line-height: 80rpx;
			height: 80rpx;
			width: 800rpx;
		}
	}

	.detail-popup {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 30rpx;
		color: #333333;
		font-size: 30rpx;
	}
</style>
