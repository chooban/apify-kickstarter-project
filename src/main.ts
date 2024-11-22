import { Actor, ProxyConfiguration } from 'apify';
import { PlaywrightCrawler, RequestOptions } from 'crawlee';

interface Input {
    projectUrls: string[];
    maxRequestsPerCrawl: number;
    proxyConfig: ProxyConfiguration,
}

// Initialize the Apify SDK
await Actor.init();

// Structure of input is defined in input_schema.json
const {
    projectUrls = [
        // 'https://www.kickstarter.com/projects/neilslorance/pirate-fun-the-third-trial',
        // 'https://www.kickstarter.com/projects/goatsflyingpress/the-fables-of-erlking-wood',
    ],
    maxRequestsPerCrawl = 100,
    proxyConfig,
} = await Actor.getInput<Input>() ?? {} as Input;

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    async requestHandler({ request, log, page }) {
        log.info(`Requesting: ${request.url}`);
        const rawProjectDetails = await page.evaluate(() => {
            // @ts-expect-error It's fine
            return window.current_project || 'Property not found';
        });
        const { data: projectDetails } = JSON.parse(JSON.stringify(rawProjectDetails));

        const title = projectDetails.name;
        const category = projectDetails.category.name;
        const categoryParent = projectDetails.category.parent_name;

        const dataToPush = {
            title,
            category,
            categoryParent,
        };
        log.info(JSON.stringify(dataToPush));
        await Actor.pushData(dataToPush);
    },
});

const requests = projectUrls.map((u) => {
    return {
        url: u,
        proxyConfig,
    } as RequestOptions;
});
await crawler.run(requests);

// Exit successfully
await Actor.exit();
