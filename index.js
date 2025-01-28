/* istanbul ignore file */

// import helmet from 'helmet';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';

/** MAIN ************************************************************** */
const app = express();
const PORT = process.env.PORT || 3000;

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

/** ROUTES ************************************************************* */

app.get('/', async (req, res) => {
    /*** Get latest posts from `latest_posts` table */
    res.render('index', {});
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
    console.info(
        'backend listening on port %d (http://localhost:%d)',
        PORT,
        PORT,
    );
});