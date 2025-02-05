
export class PostService {
    /**
     * Converts markdown text to HTML for rendering on the front end
     * @param {String} markdownText - markdown to convert
     * @returns {String[]} list of HTML strings
     */
    static toHTML(markdownText) {
      // Split by both \n and \r\n
      const lines = markdownText.split(/\r?\n/);
  
      // Convert each line to HTML
      return lines.map((line) => {
        // Remove tab characters
        let html = line.replace(/\t/g, '');
  
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
        return `<p>${html}</p>`;
      });
    }

    /**
	 * @param {String[]} htmlArray - an array of HTML strings
	 * @param {Number} count - the number of paragraphs to 
	 * include in the summary
	 */
	static toSummary(htmlArray, count = 5) {
        if (count <= 0) return [];
        return htmlArray.slice(0, count);
    }
}