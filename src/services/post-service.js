import { readingTime } from 'reading-time-estimator';


export class PostService {
  /**
   * Converts markdown text to HTML for rendering on the front end
   * @param {String} markdownText - markdown to convert
   * @returns {String[]} list of HTML strings
   */
  toHTML(markdownText) {
    // Ignore header data
    const body = markdownText.split(/\r?\n\r?\n/).slice(1).join('\n');
    const lines = body.split(/\r?\n/);

    // Convert each line to HTML
    return lines.map((line) => {
      // Remove tab characters
      let html = line.replace(/\t/g, '');

			// Process horizontal rule (---)
      if (html.trim() === '---') {
        return '<p class="section-break">&nbsp;</p>\n<hr>\n<p class="section-break">&nbsp;</p>';
      }

			// Process headings (#, ##, ###, etc.)
      const headingMatch = html.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        return `<h${level}>${headingMatch[2].trim()}</h${level}>`;
      }

      // Basic Markdown conversions
      // Bold: **text** or __text__
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

      // Italic: *text* or _text_
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/_(.*?)_/g, '<em>$1</em>');

      // Links: [text](url)
      html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

      // Inline code: `code`
      html = html.replace(/`(.*?)`/g, '<code>$1</code>');

      // Wrap in <p> tags, even if the line is empty
      return `<p class="paragraph-indent">${html}</p>`;
    });
  }

  /**
	 * @param {String[]} htmlArray - an array of HTML strings
	 * @param {Number} count - the number of paragraphs to 
	 * include in the preview HTML
	 */
	toSummary(htmlArray, count = 5) {
    if (count <= 0) return [];
    return htmlArray.slice(0, count);
  }

  Post = class {
    /**
     * 
     * @param {String} id - file id created by Google Docs
     * @param {String} rawText - content of the post
     */
    constructor(id, rawText) {
      const { minutes, words } = readingTime(rawText);

			this.contentId = id;
      this.raw = rawText;
      this.author = '';
      this.date = {};
      this.html = '';
      this.previewHTML = '';
      this.readingTimeMinutes = minutes;
      this.readingTimeDisplay = `${minutes} minutes`;
      this.tags;
      this.title = '';
      this.uri = '';
      this.url = '';
      this.approxWordCount = words;

      this.parseMetadata();
    }

    /**
     * @returns {void}
     */
    parseMetadata() {
      const lines = this.raw.split(/\r?\n/);

      lines.forEach((line) => {
        if (line.startsWith('TITLE:')) {
          this.title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('AUTHOR:')) {
          this.author = line.replace('AUTHOR:', '').trim();
        } else if (line.startsWith('DATE:')) {
          const dateStr = line.replace('DATE:', '').trim();
          const [month, day, year] = dateStr.split('.');
          const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          this.date = {
            day: day,
            year: year,
            month: monthNames[parseInt(month, 10) - 1] || '',
          };

          this.penDate = `${this.date.year}-${monthNames.indexOf(this.date.month)+1}-${this.date.day}`;
        } else if (line.startsWith('WORD COUNT:')) {
         //this.approxWordCount = Number(line.replace('WORD COUNT:', '').trim());
        } else if (line.startsWith('URI:')) {
          this.uri = line.replace('URI:', '').trim();
          this.parseURI(this.uri);
        }
      });
    }

    /**
     * 
     * @param {String} uri 
     * @returns {void}
     */
    parseURI(uri) {
      try {
        const url = new URL(uri);
        const params = new URLSearchParams(url.search);
        this.previewLength = parseInt(params.get('previewLength'), 10) || 0;
        this.tags = params.get('tags').split(',');
        this.slug = params.get('slug') || '';

        if (this.contentId && this.slug) {
          this.url = `/${this.contentId}?slug=${this.slug}`;
        }
      } catch (ex) {
        console.error(
          `INTERNAL_ERROR (PostService): Exception encountered while parsing uri (${uri}) See details -> ${ex.message}`
        );
      }
    }
  };
}