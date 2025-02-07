/* istanbul ignore file */

// import helmet from 'helmet';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

import figlet from 'figlet';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

import { promisify } from 'util';
import morgan from 'morgan';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

import { PostService } from './src/services/post-service.js';

/** MAIN ************************************************************** */
const app = express();
const PORT = process.env.PORT || 3000;
const APP_NAME = 'brown.paper.bag';
const APP_VERSION = '0.0.1';

const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const figletize = promisify(figlet);
const banner = await figletize(`${APP_NAME} v${APP_VERSION}`);

const client = createClient(DATABASE_URL, SERVICE_ROLE);
const postService = new PostService();
const TAG_MAP = Object.freeze({
    'last-rites': 'Last Rites',
    'cloud-city': 'Cloud City'
});

/** MIDDLEWARE ******************************************************** */
// Disabled to fix (https://github.com/seanttaylor/wanderlust/issues/17)

// eslint-disable-next-line
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line
const __dirname = dirname(__filename);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views/ejs'));
app.use(express.static(path.join(__dirname, './src/www')));

app.use(cors());
// app.use(helmet());
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

/** REAL-TIME SUBSCRIPTIONS ************************************************************* */
const rtSubscription = client.channel('rt-posts')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Change received!', payload)
      // fetch previous post inserted using the `order` method to sort in descending order by `created_at`
      // set the `next` property of the previous post the `contentId` of the current post (i.e. the payload)
      // set the `prev` property of the current post the `contentId` the current post
    }
  )
  .subscribe();

/** ROUTES ************************************************************* */
app.get('/', async (req, res) => {
    
    let { data: posts, error } = await client .from('posts')
    .select('*');
    
    /*** Get latest posts from `latest_posts` table */
    res.render('index', { posts });
});

app.get('/posts/:contentId', async (req, res) => {
    const contentId = req.params.contentId.slice(0, 17);
    const { data, error } = await client.from('posts')
    .select('*')
    .eq('contentId', contentId);
    
    const [post] = data;
    
    res.render('post', { post, tagMap: TAG_MAP });
});

app.use((req, res) => {
    res.status(404).send({ status: 404, error: 'Not Found' });
});

// eslint-disable-next-line
app.use((err, req, res, next) => {
    const status = err.status || 500;
    console.error(err);
    res.status(status).send({ status, error: 'There was an error.' });
});
  
http.createServer(app).listen(PORT, () => {
    console.log(`${banner}\n`);
    console.info(
        'Application listening on port %d (http://localhost:%d)',
        PORT,
        PORT,
    );
});