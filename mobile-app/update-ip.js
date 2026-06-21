const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Helper script to automatically detect and update the .env file with your local IP
 * Run this script whenever you switch networks
 */

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();

    // Priority order: WiFi, Ethernet, then others
    const priorityOrder = ['Wi-Fi', 'WiFi', 'Ethernet', 'en0', 'eth0'];

    // First, try priority interfaces
    for (const name of priorityOrder) {
        if (interfaces[name]) {
            for (const iface of interfaces[name]) {
                // Skip internal (loopback) and non-IPv4 addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }

    // Fallback: find any non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return null;
}

function updateEnvFile() {
    const envPath = path.join(__dirname, '.env');
    const localIP = getLocalIPAddress();

    if (!localIP) {
        console.error('❌ Could not detect local IP address');
        console.log('💡 Please manually update .env file with your IP address');
        return;
    }

    console.log('🔍 Detected local IP:', localIP);

    // Read existing .env file if it exists
    let envContent = '';
    let port = '8002'; // default port

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');

        // Extract existing port if present
        const portMatch = envContent.match(/API_PORT=(\d+)/);
        if (portMatch) {
            port = portMatch[1];
        }

        // Check if IP has changed
        if (envContent.includes(`API_HOST=${localIP}`)) {
            console.log('✅ .env file already has the correct IP address');
            console.log(`📡 API URL: http://${localIP}:${port}/api`);
            return;
        }

        // Update existing API_HOST line
        if (envContent.includes('API_HOST=')) {
            envContent = envContent.replace(
                /API_HOST=.*/,
                `API_HOST=${localIP}`
            );
        } else {
            // Add API_HOST if it doesn't exist
            envContent += `\nAPI_HOST=${localIP}\n`;
        }

        // Ensure API_PORT exists
        if (!envContent.includes('API_PORT=')) {
            envContent += `API_PORT=${port}\n`;
        }
    } else {
        // Create new .env file
        envContent = `# Backend API Configuration\n# Auto-generated on ${new Date().toLocaleString()}\n\n# API Host (without port)\nAPI_HOST=${localIP}\n\n# API Port (change this if your backend runs on a different port)\nAPI_PORT=${port}\n`;
    }

    // Write to .env file
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file successfully');
    console.log(`📡 API URL: http://${localIP}:${port}/api`);
    console.log('\n💡 Restart your Expo server for changes to take effect:');
    console.log('   npm start');
}

// Show all network interfaces for debugging
function showAllInterfaces() {
    console.log('\n📋 All Network Interfaces:');
    console.log('─'.repeat(50));

    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                console.log(`${name}: ${addr.address}`);
            }
        }
    }
    console.log('─'.repeat(50));
}

// Main execution
console.log('🌐 Network Configuration Helper\n');
showAllInterfaces();
console.log('');
updateEnvFile();
