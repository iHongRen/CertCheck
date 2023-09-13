const http = require('http')
const tls = require('tls')

const dbTool = require('./DBTool')

const TableName = {
    Cert: 'Cert'
}

const db = new dbTool.SqliteDB('cert_info.db')

const createTable = `
CREATE TABLE IF NOT EXISTS ${TableName.Cert} (
  host varchar(256) NOT NULL,
  port integer(128) NOT NULL,
  intro varchar(65535),
  detail varchar(65535),
  expired integer(128),
  PRIMARY KEY(host, port)
);
`
db.executeSql(createTable, err => {
    if (err) {
        console.log(err)
    }
})

http.createServer(function (request, response) {
    //设置允许跨域的域名，*代表允许任意域名跨域
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Credentials', true)
    response.setHeader('Access-Control-Allow-Headers', '*')
    response.setHeader('Content-Type', 'application/json')

    const url = request.url.split('?')[0]
    console.log(url)

    // 查询所有
    if (url == '/queryAll') {
        let data = ''
        request.on('data', function (chunk) {
            data += chunk
        })
        request.on('end', async function () {
            try {
                let infos = await queryDomains()

                const promises = []
                infos.forEach(e => {
                    if (e.detail) {
                        e.detail = JSON.parse(e.detail)
                    } else {
                        let p = new Promise(async (resolve, reject) => {
                            const { host, port } = e
                            const cert = await getCertInfo({ host, port })
                            let expired = Number.MIN_VALUE
                            if (cert.valid_to) {
                                const date = new Date(Date.parse(cert.valid_to))
                                expired = date.getTime()
                            }
                            e.detail = cert
                            e.expired = expired
                            fillDomain({
                                host,
                                port,
                                detail: JSON.stringify(cert),
                                expired
                            })
                            resolve()
                        })
                        promises.push(p)
                    }
                })

                await Promise.all(promises)
                response.end(JSON.stringify(infos))
            } catch (error) {
                console.log(error)
                response.end(error.message | 'error')
            }
        })
        return
    }

    // 添加
    if (url == '/add') {
        let data = ''
        request.on('data', function (chunk) {
            data += chunk
        })
        request.on('end', function () {
            try {
                const params = JSON.parse(data)
                console.log(params)
                addDomain(params).then(e => {
                    response.end('success')
                })
            } catch (error) {
                response.end(error.message | 'error')
            }
        })
        return
    }

    // 删除
    if (url == '/delete') {
        let data = ''
        request.on('data', function (chunk) {
            data += chunk
        })
        request.on('end', async function () {
            try {
                const params = JSON.parse(data)
                await deleteDomain(params)
                response.end('success')
            } catch (error) {
                response.end(error.message | 'error')
            }
        })
        return
    }

    // 更新
    if (url == '/update') {
        let data = ''
        request.on('data', function (chunk) {
            data += chunk
        })
        request.on('end', async function () {
            try {
                const params = JSON.parse(data)
                await updateDomain(params)
                response.end('success')
            } catch (error) {
                response.end(error.message | 'error')
            }
        })
        return
    }
}).listen(8444)
console.log('TLS证书检查系统服务器已开启端口:8444')

// 捕获异常，保持不退出
process.on('uncaughtException', function (err) {
    console.error('未捕获的异常', err.message)
})

process.on('unhandledRejection', function (err, promise) {
    console.error('有Promise没有被捕获的失败函数', err.message)
})

function queryDomains() {
    return new Promise((resolve, reject) => {
        const sql = `select host,port,intro,detail,expired from ${TableName.Cert}`
        db.queryData(sql, (data, error) => {
            if (error) {
                reject(error)
            } else {
                resolve(data.length > 0 ? data : [])
            }
        })
    })
}

function queryDomain({ host, port }) {
    return new Promise((resolve, reject) => {
        const sql = `select host,port,intro,detail,expired from ${TableName.Cert} where host='${host}' and port='${port}'`
        db.queryData(sql, (data, error) => {
            if (error) {
                reject(error)
            } else {
                resolve(data.length > 0 ? data : [])
            }
        })
    })
}

function addDomain({ host, port, intro }) {
    console.log('port' + port)
    if (!port) {
        port = 443
    }
    return new Promise(async (resolve, reject) => {
        db.executeSql(`replace into ${TableName.Cert}(host, port, intro) values ('${host}', '${port}', '${intro}')`, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function fillDomain({ host, port, detail, expired }) {
    return new Promise(async (resolve, reject) => {
        db.executeSql(`update ${TableName.Cert} set detail='${detail}', expired=${expired} where host='${host}' and port='${port}'`, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function deleteDomain({ host, port }) {
    return new Promise(async (resolve, reject) => {
        db.executeSql(`delete from ${TableName.Cert} where host='${host}' and port='${port}'`, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function updateDomain({ host, port }) {
    return new Promise(async (resolve, reject) => {
        db.executeSql(`update ${TableName.Cert} set detail = null where host='${host}' and port='${port}'`, err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function getCertInfo({ host, port }) {
    return new Promise((resolve, reject) => {
        let socket = tls.connect(
            {
                port: ~~port,
                host,
                servername: host, // this is required in case the server enabled SNI
                timeout: 1500,
                enableTrace: true,
                rejectUnauthorized: false,
                strictSSL: false,
                agent: false
            },
            () => {
                const x509Certificate = socket.getPeerCertificate(true)
                socket.destroy()
                const { subject, subjectAltName, issuer, infoAccess, valid_from, valid_to, fingerprint, fingerprint256, keyUsage, serialNumber } = x509Certificate
                resolve({
                    subject,
                    subjectAltName,
                    issuer,
                    infoAccess,
                    valid_from,
                    valid_to,
                    fingerprint,
                    fingerprint256,
                    keyUsage,
                    serialNumber
                })
            }
        )
        socket.on('error', () => {
            resolve({})
            socket.destroy()
        })
    })
}
