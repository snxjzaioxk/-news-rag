#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function checkPorts() {
    console.log('🔍 检查端口占用情况...\n');

    const ports = [3000, 3001, 3002, 3003, 3004, 3005];

    for (const port of ports) {
        try {
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
            if (stdout.trim()) {
                const lines = stdout.trim().split('\n');
                console.log(`🔴 端口 ${port} 被占用:`);
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    console.log(`   PID: ${pid}`);
                });
            } else {
                console.log(`🟢 端口 ${port} 空闲`);
            }
        } catch (error) {
            console.log(`🟢 端口 ${port} 空闲`);
        }
    }

    console.log('\n💡 使用清理脚本:');
    console.log('Windows: 双击 cleanup-and-start.bat');
    console.log('Linux/Mac: ./cleanup-and-start.sh');
}

checkPorts().catch(console.error);