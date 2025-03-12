/* istanbul ignore file */

// import helmet from 'helmet';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

import figlet from 'figlet';
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
const SubscriptionProvider = {
    INSERT: async (payload) => {
        try {
            const POST_SEQUENCE_NO = payload.new.seq;
            const { data: prev, error: selectError } = await client.from('posts').select('*')
            .lt('seq', POST_SEQUENCE_NO)
            .order('seq', { ascending: false })
            .limit(1);

            if (selectError) {
                console.error(`INTERNAL_ERROR (SubscriptionProvider): Could not finish update on post (${payload.new.contentId}) See details -> ${selectError.message}`);
                return;
            }
            const [prevPost] = prev;
            const { error: newPostError } = await client.from('posts').update({ next: payload.new.url }).eq('contentId', prevPost.contentId);
            const { error: prevPostError } = await client.from('posts').update({ prev: prevPost.url  }).eq('contentId', payload.new.contentId);
            
            if ( newPostError || prevPostError) {
                console.error(`INTERNAL_ERROR (SubscriptionProvider): There was an error updating either the new post or the prev post.  See details -> New post error ->> ${newPostError.message} | Prev post error ->> ${prevPost.message} `);
            }

        } catch(ex) { 
            console.error(`INTERNAL_ERROR: Exception encountered during post update. See details -> ${ex.message}`);
        }
    },
    UPDATE: async (payload) => {
        // noop
    },
    DELETE: async (payload) => {
        // noop
    }
};

const rtSubscription = client.channel('rt-posts')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
        try {
            SubscriptionProvider[payload.eventType](payload);
        } catch(ex) {
            console.error(`INTERNAL_ERROR (rtSubscription): Exception encountered during real-time subscription handling. See details -> ${ex.message}`);
        }
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
    const contentId = req.params.contentId;
    const { data, error } = await client.from('posts')
    .select('*')
    .eq('contentId', contentId);

    if (error) {
        console.error(`INTERNAL_ERROR (PostRouter): Could not get post (${contentId})`);
    }
    
    const [post] = data;

    if (!post) {
        console.error(`NOT FOUND: Could not find post (${contentId}`);
    }
    
    res.render('post', { post, tagMap: TAG_MAP });
});

app.put('/posts/:contentId', async (req, res) => {
    try { 
        const id = req.params.contentId;
        const { content } = req.body;

        const { data, error: selectError } = await client.from('posts').select().eq('contentId', id);
        const myPost = new postService.Post(id, content);
        myPost.html = postService.toHTML(myPost.raw);
        myPost.previewHTML = postService.toSummary(myPost.html, myPost.previewLength);

        if (selectError) {
            console.error(`INTERNAL_ERROR (PostRouter): Could not create new post (${id}). See details -> ${selectError.message}`);
            res.status(500).send({ message: 'There was an error' });
            return;
        }
        
        if (data[0]) {
            const { error: updateError } = await client.from('posts')
            .update(myPost)
            .eq('contentId', id);

            if (updateError) {
                console.error(`INTERNAL_ERROR (PostRouter): Could not update post (${id}). See details -> ${updateError.message}`);
                res.status(500).send({ message: 'There was an error' });
                return;
            }

            res.status(204).send();
            return;
        }
        
        const { error: createError } = await client.from('posts').insert(myPost);
        
        if (createError) {
            console.error(`INTERNAL_ERROR (PostRouter): Could not create new post (${id}). See details -> ${createError.message}`);
            res.status(500).send({ message: 'There was an error' });
            return;
        }

        res.status(204).send();
    } catch (ex) {
        console.error(`INTERNAL_ERROR (PostRouter): Exception encountered during post creation or update. See details -> ${ex.message}`); 
    }
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