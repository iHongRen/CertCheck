const BaseURL = 'http://localhost:8444/';

const request = (api, data) => {
	return new Promise((resolve, reject) => {
		uni.request({
			url: BaseURL + api,
			data,
			method: "POST",
			success: (res) => {
				if (res.statusCode == 200) {
					resolve(res.data);
				} else {
					reject(new Error(res.statusCode));
				}
			},
			fail: (err) => {
				reject(err);
			}
		})
	});
};


const Api = {

	queryAll() {
		return request('queryAll', {});
	},

	queryDomain({host, port}) {
		return request('query', {host, port});
	},

	addDomain({host, port, intro, project}) {
		return request('add', {host, port, intro, project});
	},

	deleteDomain({host, port}) {
		return request('delete', {host, port});
	},
	
	updateDomain({host, port}) {
		return request('update', {host, port});
	}
}

export default Api;
