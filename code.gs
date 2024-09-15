function doPost(e) {
  try {
    const gemini = new Gemini('Your Gemini API key');
    const line = new Line('Your LINE channel access token');

    const eventData = JSON.parse(e.postData.contents).events[0];
    const replyToken = eventData.replyToken;
    const messageType = eventData.message.type;
    const messageText = eventData.message.text;
    const messageId = eventData.message.id;

    switch (messageType) {
      case 'text':

        var prompt = {
          contents: [
            {
              parts: [
                {
                  text: messageText + '\nFrom the above questions, when answering question, please format them in an easy-to-read format and thai language for use in the LINE application.',
                },
              ],
            },
          ],
        };

        var response = gemini.generateContent(prompt);
        line.replyMessage(replyToken, response);
        break;
      case 'image':

        const lineContent = line.getContent(messageId)
        const blob = lineContent.getBlob();
        const base64Image = Utilities.base64Encode(blob.getBytes());

        var prompt = {
          contents: [
            {
              parts: [
                { text: 'Please Analyze this picture.\nWhen answering, please format them in an easy-to-read format and thai language for use in the LINE application.' },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        };

        var response = gemini.generateContent(prompt);
        line.replyMessage(replyToken, response);
        break;
      case 'file':
        line.replyMessage(replyToken, 'ขออภัยไม่รองรับไฟล์ประเภทนี้ รองรับเฉพาะข้อความและรูปภาพเท่านั้น');
        break;
      default:
        line.replyMessage(replyToken, 'ประเภทข้อความไม่ถูกต้อง');
    }

  } catch (error) {
    console.error('Error in doPost:', error);

    if (typeof (replyToken) !== "undefined")
      line.replyMessage(replyToken, 'เกิดข้อผิดพลาด');
  }
}

class Line {

  constructor(channelToken) {
    this.channelToken = channelToken;
    this.replyMessageEndpoint = 'https://api.line.me/v2/bot/message/reply';
    this.getContentEndpoint = 'https://api-data.line.me/v2/bot/message/{messageId}/content';
  }

  replyMessage(replyToken, replyMessage) {

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.channelToken,
    };

    const data = {
      'replyToken': replyToken,
      'messages': [{ 'type': 'text', 'text': replyMessage }],
    };

    const options = {
      'method': 'post',
      'headers': headers,
      'payload': JSON.stringify(data),
    };

    UrlFetchApp.fetch(this.replyMessageEndpoint, options);
  }

  getContent(messageId) {

    const headers = {
      "headers": { "Authorization": "Bearer " + this.channelToken }
    };

    const response = UrlFetchApp.fetch(this.getContentEndpoint.replace("{messageId}", messageId), headers);
    return response;
  }
}

class Gemini {

  constructor(apiKey) {
    //https://ai.google.dev/gemini-api/docs/models/gemini
    //gemini-1.5-pro-latest or gemini-1.5-flash-latest
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' + apiKey;
  }

  generateContent(prompt) {

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(prompt),
    };

    const response = UrlFetchApp.fetch(this.endpoint, options);

    if (response.getResponseCode() === 200) {
      const responseData = JSON.parse(response.getContentText());
      const generatedText = responseData.candidates[0]?.content?.parts[0]?.text || 'ไม่พบข้อมูล';
      return generatedText;
    } else {
      return 'เกิดข้อผิดพลาดในการเรียกใช้ API: ' + response.getResponseCode();
    }
  }
}

