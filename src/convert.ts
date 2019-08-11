import domino from 'domino';
import StreamZip from 'node-stream-zip';
import { ZimCreator, ZimArticle } from '@openzim/libzim';

export async function zipToZim(zipIn: string, zimOut: string) {
    const zip = new StreamZip({
        file: zipIn,
    });

    const creator = new ZimCreator({
        fileName: zimOut,
        welcome: 'index.html'
    });

    let done: any;
    const doneP = new Promise((resolve) => done = resolve);
    let doneTimeout = setTimeout(() => done(), 1000);
    zip.on('entry', async (entry: any) => {
        if (entry.isFile) {
            const url: string = entry.name;
            let data = zip.entryDataSync(url);
            if (url.endsWith('.html')) {
                data = data.toString();
                const doc = domino.createDocument(data) as DominoElement;
                const hrefs: DominoElement[] = Array.from(doc.querySelectorAll('a,link'));
                const srcs: DominoElement[] = Array.from(doc.querySelectorAll('script,img,video,audio,source'));

                for (const el of hrefs) {
                    const oldHref = el.getAttribute('href');
                    if (oldHref && oldHref.startsWith('/')) {
                        el.setAttribute('href', '/A' + oldHref);
                    }
                }
                for (const el of srcs) {
                    const oldSrc = el.getAttribute('src');
                    if (oldSrc && oldSrc.startsWith('/')) {
                        el.setAttribute('src', '/A' + oldSrc);
                    }
                }
                data = doc.outerHTML;
            }
            const article = new ZimArticle({
                url,
                data,
                ns: 'A'
            });
            await creator.addArticle(article);
        }
        clearTimeout(doneTimeout);
        doneTimeout = setTimeout(() => done(), 1000);
    });

    await doneP;
    await creator.finalise();
}
