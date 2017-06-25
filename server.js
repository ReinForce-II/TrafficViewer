'use strict';
var http = require('http');
var config = require('config.json')('./mconfig.json');
var exec = require('child_process').exec;
var fs = require('fs');
function logTraffic() {
    exec(`cat /proc/net/dev|grep ${config.interface}:|awk '{printf $10}'`, function (err, out, code) {
        if (!err) {
            var time = new Date();
            fs.appendFileSync(`./traffic.log`, `${time.getTime()} ${out}\n`);
        }
    });
}
setInterval(logTraffic, 1000 * config.granularity);

http.createServer(function (req, res) {
    switch (req.url) {
        case '/query':
            var arr_traffic = fs.readFileSync('./traffic.log', 'utf-8').match(/\d+ \d+\n/g);
            var ret = new Array();
            arr_traffic.forEach((ele, idx) => {
                var e_traf = ele.match(/(\d+) (\d+)\n/);
                var date = new Date();
                var startDate;
                if (date.getDate() < config.start)
                    startDate = new Date(date.getFullYear(), date.getMonth() - 1, config.start);
                else
                    startDate = new Date(date.getFullYear(), date.getMonth(), config.start);

                if (e_traf[1] < startDate) {
                    return;
                }
                if (idx === 0) {
                    ret.push([e_traf[1], 0]);
                }
                else {
                    var e_traf_f = arr_traffic[idx - 1].match(/(\d+) (\d+)\n/);
                    var traf = e_traf[2] - e_traf_f[2];
                    if (traf < 0) {
                        ret.push([e_traf[1], e_traf[2]]);
                    }
                    else {
                        ret.push([e_traf[1], traf]);
                    }
                }
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(ret));
            break;
        default:
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync('./html/traffic.html', 'utf-8'));
            break;
    }
}).listen(config.http_port || 1337);

