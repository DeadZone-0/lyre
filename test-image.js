import terminalImage from 'terminal-image';
import got from 'got';

async function test() {
    const url = 'https://i.scdn.co/image/ab67616d0000b273dd0a40eecd4b13e4c59988da';
    try {
        console.log('Fetching image...');
        const buffer = await got(url).buffer();
        console.log('Buffer size:', buffer.length);
        const image = await terminalImage.buffer(buffer, { width: 20, height: 10 });
        console.log('Rendered image length:', image.length);
        console.log('Is empty?', image === '');
        console.log('Rendered image:');
        console.log(image);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
