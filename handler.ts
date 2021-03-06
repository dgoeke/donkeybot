import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import * as request from 'request-promise-native';
import * as html2text from 'html-to-text';
import { DynamoDB } from 'aws-sdk';
import * as crypto from 'crypto';
import * as he from 'he';

const dynamoDb = new DynamoDB.DocumentClient();
const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest("hex");

const dynamoTable = process.env.DYNAMODB_TABLE;
const webpageURI = process.env.WEBPAGE_URI;

const slackOptions = {
  webhookURL: process.env.SLACK_URL,
  channel:    process.env.SLACK_CHANNEL,
  username:   process.env.SLACK_USERNAME,
  avatar:     process.env.SLACK_AVATAR
};

const websiteText = async (uri : string) => {
  const result = await request.get({ uri: uri });

  return html2text.fromString(result, {
    baseElement: ["div.thb-text"],
    ignoreHref: true,
    ignoreImage: true,
    format: {
      text: function (elem, _) {
        var text = elem.data.trim();
        return text == "" ? text : he.decode(text) + "\n";
      }
    }
  });
};

const dbHash = async (uri: string) => {
  const params = {
    TableName: dynamoTable,
    Key: { uri: uri }
  };

  const response = await dynamoDb.get(params).promise();
  return response.Item['hash'] || '';
};

const storeDbHash = async (uri, hash) => {
  const params = {
    TableName: dynamoTable,
    Key: { uri: uri },
    UpdateExpression: "set #hash = :hash, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      '#hash': 'hash',
    },
    ExpressionAttributeValues: {
      ':hash': hash,
      ':updatedAt': (new Date()).getTime(),
    }
  };

  return dynamoDb.update(params).promise();
};

const postToSlack = async (text, slackOptions) => {
  return request.post(slackOptions.webhookURL, {
    json: true,
    body: {
      text: "<!channel> " + text,
      channel: slackOptions.channel,
      username: slackOptions.username,
      icon_url: slackOptions.avatar,
      link_names: true,
      attachments: [
        {
          fallback: "Roaring Donkey Trivia Night: http://www.roaring-donkey.com/trivia-night",
          actions: [
            {
              type: "button",
              text: "Trivia Night Website",
              url: "http://www.roaring-donkey.com/trivia-night"
            }
          ]
        }
      ]
    }
  });
};

export const check: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  const liveText : string = await websiteText(webpageURI);
  const cachedHash : string = await dbHash(webpageURI);
  const liveHash = md5(liveText);
  const isDifferent = (liveHash != cachedHash);

  if (isDifferent) {
    await storeDbHash(webpageURI, liveHash);
    await postToSlack(liveText, slackOptions);
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      webpageURI: webpageURI,
      liveText: liveText,
      cachedHash: cachedHash,
      liveHash: liveHash,
      isDifferent: isDifferent
    }),
  };

  cb(null, response);
}
