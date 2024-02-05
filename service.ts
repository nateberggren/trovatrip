/* eslint-disable no-console */

import express, {Express, Request, Response} from 'express';
import http, {IncomingMessage} from 'http';
import * as https from 'https';

// **** Run **** //

interface DataObject {
    id: string,
    name: string,
    status: string,
    tripPath: string,
    tags: string,
    categories: string[],
    heroPhoto: string,
    datePeriod: string,
    destination: string,
    price: number,
    pendingTravelers: number,
    cancelledTravelers: number,
    confirmedTravelers: number,
    onHoldTravelers: number,
    minimumTripThreshold: number,
    maximumSpots: number,
    potentialEarnings: number,
    startDate: string,
    filterClasses: string,
    host: {
        '_id': string,
        name: string
    },
    operator: {
        '_id': string,
        userId: string,
        name: string
    },
    activityLevel: number
}

class Service {
    private url: string;

    public constructor(url: string) {
        this.url = url;
    }

    public fetchAll(): Promise<unknown> {
        const processor = (results: DataObject[]) => results;
        return this.fetchData(processor);
    }

    public fetchPaginated(page: number, limit: number): Promise<unknown> {
        const processor = this.getPaginator(page, limit);
        return this.fetchData(processor);
    }

    public fetchSorted(
        sortOrder: 'asc' | 'desc',
        sortKey: keyof DataObject,
    ): Promise<unknown> {
        const processor = this.getSorter(sortOrder, sortKey);
        return this.fetchData(processor);
    }

    public fetchSortedPaginated(
        sortOrder: 'asc' | 'desc',
        sortKey: keyof DataObject,
        page: number,
        limit: number,
    ) {
        const processor = (results: DataObject[]) => {
            const sorted: DataObject[] = this.getSorter(sortOrder, sortKey)(results);
            return this.getPaginator(page, limit)(sorted);
        };
        return this.fetchData(processor);
    }

    private getPaginator(page: number, limit: number) {
        const pageBeginIndex: number = (page - 1) * limit;
        const pageEndIndex: number = pageBeginIndex + limit;

        return (results: DataObject[]): DataObject[] => {
            return results.slice(pageBeginIndex, pageEndIndex);
        };
    }

    private getSorter(sortOrder: 'asc'|'desc', sortKey: keyof DataObject) {
        return (results: DataObject[]) => {
            return results.sort(
                (o1: DataObject, o2: DataObject): number => {
                    if (o1[sortKey] > o2[sortKey]) {
                        return sortOrder === 'asc' ? 1 : -1;
                    }
                    if (o1[sortKey] < o2[sortKey]) {
                        return sortOrder === 'asc' ? -1 : 1;
                    }
                    return 0;
                });
        };
    }

    // eslint-disable-next-line max-len
    private fetchData(processor: (results: DataObject[]) => DataObject[]): Promise<unknown> {
        return new Promise((resolve, reject): void => {
            https.get(this.url,
                (res: IncomingMessage): void => {

                    const chunks: Uint8Array[] = [];
                    res.on('data', (chunk: Uint8Array): void => {
                        chunks.push(chunk);
                    });
                    res.on('end', (): void => {
                        const responseBody: string = Buffer.concat(chunks).toString();
                        let results: DataObject[];
                        try {
                            /*
                             eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            */
                            ({data: results} = JSON.parse(responseBody));
                            resolve(processor(results));
                        } catch (e: unknown) {
                            reject(e);
                        }
                    });
                    res.on('error', (err: Error) => reject(err));
                });
        });
    }
}

const serverTest = (): void => {
    console.log('running test function');

    const testEndpoint = (url: string): void => {
        http.get(url,
            (res: IncomingMessage): void => {

                const chunks: Uint8Array[] = [];
                res.on('data', (chunk: Uint8Array): void => {
                    chunks.push(chunk);
                });
                res.on('end', (): void => {
                    const result: string = Buffer.concat(chunks).toString();
                    console.log(result);
                });
            });
    };

    // testEndpoint('http://localhost:3000/fetch-all');
    testEndpoint('http://localhost:3000/fetch-paginated?page=1&limit=2');
    // eslint-disable-next-line max-len
    // testEndpoint(
    //   'http://localhost:3000/fetch-sorted?sortOrder=asc&sortKey=id',
    // );
};

// eslint-disable-next-line max-len
const service: Service = new Service('https://maven-production-clone.herokuapp.com/public/trip-details');

const TrovaTripDetailsProxy: Express = express();
TrovaTripDetailsProxy.use('/fetch-all', (req: Request, res: Response): void => {
    service.fetchAll()
        .then((r: unknown): void => {
            res.json(r);
        });
});

TrovaTripDetailsProxy.use(
    '/fetch-paginated',
    (req: Request, res: Response): void => {
        const page: number = parseInt(<string>req.query.page);
        const limit: number = parseInt(<string>req.query.limit);
        service.fetchPaginated(page, limit)
            .then((r: unknown): void => {
                res.json(r);
            });
    });

TrovaTripDetailsProxy.use(
    '/fetch-sorted',
    (req: Request, res: Response): void => {
        service.fetchSorted(
            <'asc'|'desc'>req.query.sortOrder,
            <keyof DataObject>req.query.sortKey,
        )
            .then((r: unknown): void => {
                res.json(r);
            });
    });

TrovaTripDetailsProxy.use(
    '/fetch-sorted-paginated',
    (req: Request, res: Response): void => {
        const page: number = parseInt(<string>req.query.page);
        const limit: number = parseInt(<string>req.query.limit);
        service.fetchSortedPaginated(
            <'asc'|'desc'>req.query.sortOrder,
            <keyof DataObject>req.query.sortKey,
            page,
            limit,
        )
            .then((r: unknown): void => {
                res.json(r);
            });
    });

// TrovaTripDetailsProxy.use(
//   '/search',
//   (req: Request, res: Response): void => {
//     // search key, search text,
//     // search operator (< = > <= >= * lt lte gt gte match)
//     res.json({
//       'endpoint': 'search',
//     });
//   });

TrovaTripDetailsProxy.listen(3000, (): void => {
    console.log('Express server started on port: 3000');
    serverTest();
});
