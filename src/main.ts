import { Actor, ProxyConfiguration } from 'apify';
import { PlaywrightCrawler, RequestOptions } from 'crawlee';

interface Input {
    projectUrls: {url: string}[];
    maxRequestsPerCrawl: number;
    proxyConfig: ProxyConfiguration,
}

await Actor.init();

// Structure of input is defined in input_schema.json
const {
    projectUrls = [],
    maxRequestsPerCrawl = 100,
    proxyConfig,
}: Input = await Actor.getInput<Input>() ?? {} as Input;

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    async requestHandler({ request, log, page }) {
        log.info(`Requesting: ${request.url}`);
        const rawProjectDetails = await page.evaluate(() => {
            // @ts-expect-error It's fine
            return window.current_project || 'Property not found';
        });
        const { data: projectDetails } = JSON.parse(JSON.stringify(rawProjectDetails));

        if (!projectDetails) {
            await Actor.pushData({
                title: 'Unknown',
                category: 'Unknown',
                parentCategory: 'Unknown',
                url: request.url,
            });
            return;
        }

        const category = projectDetails.category.name;
        const categoryParent = projectDetails.category.parent_name;
        const {
            name: title,
            blurb,
            country,
            currency,
            currencySymbol,
            goal,
            pledged,
            creator,
            deadline,
        } = projectDetails;

        const creatorDetails = {
            name: creator.name,
            username: creator.slug,
            avatar: creator.avatar,
            url: creator.urls.web,
        };
        const dataToPush = {
            title,
            category,
            blurb,
            country,
            currency,
            currencySymbol,
            goal,
            pledged,
            parentCategory: categoryParent,
            url: request.url,
            creatorDetails,
            image: projectDetails.photo.med,
            deadline,
        };
        await Actor.pushData(dataToPush);
    },
});

const requests = projectUrls.map((u) => {
    return {
        url: u.url,
        proxyConfig,
    } as RequestOptions;
});
await crawler.run(requests);

// Exit successfully
await Actor.exit();
