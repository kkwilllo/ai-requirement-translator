import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

const createPrompt = (
  input_background: string,
  input_requirement: string,
  input_testcases_senario: string,
  input_extra_requirement: string,
) => {
    return endent`
      Project Background:
      \`\`\`${input_background}\`\`\`

      Below are rules and requirements:
      \`\`\`${input_requirement}\`\`\`

      Below are all the sample test cases and all the senarios:
      \`\`\`${input_testcases_senario}\`\`\`

      Please help to generate the result that 100% obey all below criteria:
      - Please generate all staging & final equation that must obey all rules requirements and must pass the scenario or test cases provided.
      - Please list all the variables used in the equation and define them clearly.
      - Please list all the assumption you have made during the process
      - Please ensure each variable has defined clearly it generated based on which rules and how it fit the rules requirement.
      - If the variable have any logical dependency, please provide the equation on how to calculate that varaible.
      - It is a must that all variables listed must be included in the equation.
      - Please also provide 2 sample test cases that are not same as "scenario or test cases" to show that the equations match the rules 100%. The sample test cases must clearly mention all the variables being used and why the variables values are as they are.
      - Please do not create new rules. If the above rules are not clear, please tell me what to update.
      - Please respond after the 'Output' section.
      - The equation must look like pseudo code. And it must not be specific for any code langauge.`+
        ( input_extra_requirement.length > 10 ? ('\n- '+input_extra_requirement ): '')+
      '\n'+
      `EXAMPLE
      
      =======
      EXAMPLE 1
      -------
      Project Background:
      The project is a web-based application that allows users to calculate the amount of energy required to heat a room. The application will be used by homeowners and contractors to determine the amount of energy required to heat a room to a desired temperature.

      Below are rules and requirements:
      - The application must allow users to enter the dimensions of the room (length, width, and height) in feet.
      - The application must allow users to enter the desired temperature in degrees Fahrenheit.
      - The application must calculate the amount of energy required to heat the room in BTUs (British Thermal Units).
      - The application must display the calculated result to the user.
      
      Below are all the sample test cases and all the senarios:
      - Test Case 1: User enters the dimensions of the room as 10 feet by 12 feet by 8 feet and the desired temperature as 70 degrees Fahrenheit. The application should calculate the amount of energy required to heat the room to 70 degrees Fahrenheit and display the result to the user.
      - Test Case 2: User enters the dimensions of the room as 15 feet by 20 feet by 10 feet and the desired temperature as 80 degrees Fahrenheit. The application should calculate the amount of energy required to heat the room to 80 degrees Fahrenheit and display the result to the user.

      [Output]:

      Assumption:
      - constant_C: the constant that represents the amount of energy required to heat one cubic foot of air by one degree Fahrenheit
      
      Possible variables definition mentioned in the requirement (with unit):
      - length: the length of the room (feet)
      - width: the width of the room (feet)
      - height: the height of the room (feet)
      - desired_temperature: desired temperature (degrees Fahrenheit)
      - outside_temperature: outside temperature (degrees Fahrenheit)

      The following formula can be used to calculate the amount of energy required to heat a room:
        energy_required = volume_of_room * temperature_difference * constant_C
      where:
      - volume_of_room is the volume of the room in cubic feet (length x width x height).
      - temperature_difference is the difference between the desired temperature and the outside temperature in degrees Fahrenheit (desired_temperature - outside_temperature)
      - constant_C = 1.1 which is a constant that represents the amount of energy required to heat one cubic foot of air by one degree Fahrenheit.

      [END OF EXAMPLE 1]
      =======

[Output]:`;
  
};

export const OpenAIStream = async (
  input_background: string,
  input_requirement: string,
  input_testcases_senario: string,
  input_extra_requirement: string,
  model: string,
  key: string,
) => {
  const prompt = createPrompt(input_background, input_requirement, input_testcases_senario, input_extra_requirement);
  // return prompt

  const system = { role: 'system', content: prompt };

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key || process.env.OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [system],
      temperature: 0,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const statusText = res.statusText;
    const result = await res.body?.getReader().read();
    throw new Error(
      `OpenAI API returned an error: ${
        decoder.decode(result?.value) || statusText
      }`,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
