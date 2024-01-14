import { TranslateBody } from '@/types/types';
import { OpenAIStream } from '@/utils';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { input_background, input_requirement, input_testcases_senario,input_extra_requirement, model, apiKey } =
      (await req.json()) as TranslateBody;

    const stream = await OpenAIStream(
      input_background,
      input_requirement,
      input_testcases_senario,
      input_extra_requirement,
      model,
      apiKey,
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
