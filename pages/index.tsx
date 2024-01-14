import { APIKeyInput } from '@/components/APIKeyInput';
import { CodeBlock } from '@/components/CodeBlock';
import { LanguageSelect } from '@/components/LanguageSelect';
import { ModelSelect } from '@/components/ModelSelect';
import { TextBlock } from '@/components/TextBlock';
import { OpenAIModel, TranslateBody } from '@/types/types';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [input_background, setinput_background] = useState<string>('carpark system fee calculation based on the entry date and exit date');
  const [input_requirement, setinput_requirement] = useState<string>(`
  |rule #   |	rules requirement|
  |---------|------------------|
  |rule #1  |	The calculation is from the planned arrival datetime to planned departure datetime|
  |rule #2  |	There are a total of 4 fee rate types - (1) Normal Day Hourly Rate, (2) Normal Day Daily Cap, (3) Peak Day Hourly Rate, (4) Peak Day Daily Cap, all configurable as parameters|
  |rule #3  |	Once the aggregated hourly rate (1) Normal Day Hourly Rate or (3) Peak Day Hourly Rate per day reached the daily cap, the daily cap should apply for that day|
  |rule #4  |	Instead of calendar day, the parking day starts counting from the planned arrival datetime + 24 hours|
  |rule #5  |	In case the parking day falls in both normal and peak days, or in both Booking and Overstay hours, the highest rate should apply For example, when 2 Jan is normal day & 3 Jan is peak day, peak day rate should apply for the parking day "2 Jan 0700 - 3 Jan 0700"|
  |rule #6  |	The aggregated amount from rules (rule #2, rule #3, rule #4 rule #5) = the Parking Fee|
  |rule #7  |	Customer could either purchase or not purchase insurance. Insurance amount is returned from TaiPing API|
  |rule #8  |	Insurance amount is non-refundable|
  |rule #9  |	Discount can be applied either as a fixed amount or as a percentage|
  |rule #10 |	Discount will be applied to the total parking fee, excluding the insurance amount|
  |rule #11 |	Discounted amount could not exceed the total parking fee|
  |rule #12 |	Discounted amount is non-refundable|
  |rule #13 |	Total payment = parking fee (rule #6) + insurance (rule #7, rule #8) - discount (rule #9, rule #10, rule #11 rule #12)|
  `);
  const [input_testcases_senario, setinput_testcases_senario] = useState<string>(`
  Scenario 1:

  In the given scenario, where the vehicle arrives at 07:00 on 1st Jan and leaves at 10:00 on 5th Jan, with 1st Jan, 2nd Jan & 4th Jan being normal days and 3rd Jan & 5th Jan being peak days, we'll calculate the parking fee as follows:

  Calculate the duration of stay: 
  - The vehicle stayed for approximately 99 hours, from 07:00 on 1st Jan to 10:00 on 5th Jan.

  Identify the type of day for each parking day:
  - 1st Jan is a normal day.
  - 2nd Jan is a normal day.
  - 3rd Jan is a peak day.
  - 4th Jan is a normal day.
  - 5th Jan is a peak day.

  Apply the fee calculation:
  - Calculate the fee for the first parking day (from 07:00 on 1st Jan to 07:00 on 2nd Jan) based on the normal day daily cap of $100.
  - Calculate the fee for the second parking day (from 07:00 on 2nd Jan to 07:00 on 3rd Jan) based on the peak day daily cap of $200.
  - Calculate the fee for the third parking day (from 07:00 on 3rd Jan to 07:00 on 4th Jan) based on the peak day daily cap of $200.
  - Calculate the fee for the forth parking day (from 07:00 on 4th Jan to 07:00 on 5th Jan) based on the normal day daily cap of $100.
  - Calculate the fee for the additional 3 hours (from 07:00 to 10:00 on 5th Jan) based on the peak day hourly rate of $20 per hour.

  Calculation:
  - Fee for the first parking day (24 hours): $100 (normal day daily cap).
  - Fee for the second parking day (24 hours): $200 (peak day daily cap).
  - Fee for the third parking day (24 hours): $200 (peak day daily cap).
  - Fee for the forth parking day (24 hours): $100 (normal day daily cap).
  - Fee for the additional 3 hours: 3 hours * $20/hour = $60 (peak day hourly rate).
  Therefore, the total parking fee for the given scenario, where the vehicle arrives at 07:00 on 1st Jan and leaves at 10:00 on 3rd Jan, is $100 + $200 + $200 + $100 + $60 = $660.

  Test Case 2:
  The vehicle arrives at 07:00 on 1st Jan and leaves at 10:00 on 5th Jan where all of the parking days are normal day. If (normal day daily cap)=$100 and (normal day hourly rate)=$10, then the calculated parking fee = $430

  Test Case 3:
  The vehicle arrives at 07:00 on 1st Jan and leaves at 17:00 on 1st Jan where all of the parking days are normal day. If (normal day daily cap)=$100 and (normal day hourly rate)=$10, then the calculated parking fee = $100
  `);
  const [input_extra_requirement, setinput_extra_requirement] = useState<string>('');
  const [outputCode, setOutputCode] = useState<string>('');
  const [model, setModel] = useState<OpenAIModel>('gpt-3.5-turbo');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasTranslated, setHasTranslated] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');

  const handleTranslate = async () => {
    // const maxPromptLength = model === 'gpt-3.5-turbo' ? 6000 : 12000;
    const maxPromptLength = model === 'gpt-3.5-turbo' ? 5000 : 10000;

    if (!apiKey) {
      alert('Please enter an API key.');
      return;
    }

    if (input_background.length <= 10) {
      alert('Please share some more details about project background (Expectation: > 10 char).');
      return;
    }

    if (input_requirement.length <= 10) {
      alert('Please share some more rules or requirement details (Expectation: > 10 char).');
      return;
    }
    if (input_testcases_senario.length <= 10) {
      alert('Please share some expected test cases or senario (Expectation: > 10 char).');
      return;
    }

    if (input_testcases_senario.length > maxPromptLength) {
      alert(
        `Please enter code less than ${maxPromptLength} characters. You are currently at ${input_testcases_senario.length} characters.`,
      );
      return;
    }

    setLoading(true);
    setOutputCode('');

    const controller = new AbortController();

    const body: TranslateBody = {
      input_background,
      input_requirement,
      input_testcases_senario,
      input_extra_requirement,
      model,
      apiKey,
    };

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setLoading(false);
      alert('Something went wrong.');
      return;
    }

    const data = response.body;

    if (!data) {
      setLoading(false);
      alert('Something went wrong.');
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let code = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);

      code += chunkValue;

      setOutputCode((prevCode) => prevCode + chunkValue);
    }

    setLoading(false);
    setHasTranslated(true);
    copyToClipboard(code);
  };

  const copyToClipboard = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);

    localStorage.setItem('apiKey', value);
  };

  useEffect(() => {
    if (hasTranslated) {
      handleTranslate();
    }
  }, [input_requirement]);

  useEffect(() => {
    const apiKey = localStorage.getItem('apiKey');

    if (apiKey) {
      setApiKey(apiKey);
    }
  }, []);

  return (
    <>
      <Head>
        <title>AI Requirement Translator</title>
        <meta
          name="description"
          content="Use AI to translate your requirement to formula/equation."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-full min-h-screen flex-col items-center bg-[#0E1117] px-4 pb-20 text-neutral-200 sm:px-10">
        <div className="mt-10 flex flex-col items-center justify-center sm:mt-20">
          <div className="text-4xl font-bold">AI Requirement Translator</div>
        </div>

        <div className="mt-6 text-center text-sm">
          <APIKeyInput apiKey={apiKey} onChange={handleApiKeyChange} />
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <ModelSelect model={model} onChange={(value) => setModel(value)} />

          <button
            className="w-[140px] cursor-pointer rounded-md bg-violet-500 px-4 py-2 font-bold hover:bg-violet-600 active:bg-violet-700"
            onClick={() => handleTranslate()}
            disabled={loading}
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>
        </div>

        <div className="mt-2 text-center text-xs">
          {loading
            ? 'Translating...'
            : hasTranslated
            ? 'Output copied to clipboard!'
            : 'Enter your requirement and click "Translate"'}
        </div>

        <div className="mt-6 flex w-full max-w-[1200px] flex-col justify-between sm:flex-row sm:space-x-4">
          <div className="h-100 flex flex-col justify-center space-y-2 sm:w-2/4">
            <div className="text-center text-xl font-bold">Input Background</div>
            <TextBlock
              text={input_background}
              editable={!loading}
              onChange={(value) => {
                setinput_background(value);
                setHasTranslated(false);
              }}
            />
            <div className="text-center text-xl font-bold">Input Requirement</div>
            <TextBlock
              text={input_requirement}
              editable={!loading}
              onChange={(value) => {
                setinput_requirement(value);
                setHasTranslated(false);
              }}
            />
            <div className="text-center text-xl font-bold">Input Test Cases or Senario</div>
            <TextBlock
              text={input_testcases_senario}
              editable={!loading}
              onChange={(value) => {
                setinput_testcases_senario(value);
                setHasTranslated(false);
              }}
            />
              <div className="text-center text-xl font-bold">Input Extra Requirement</div>
            <TextBlock
              text={input_extra_requirement}
              editable={!loading}
              onChange={(value) => {
                setinput_extra_requirement(value);
                setHasTranslated(false);
              }}
            />
          </div>
          <div className="mt-8 flex h-full flex-col justify-center space-y-2 sm:mt-0 sm:w-2/4">
            <div className="text-center text-xl font-bold">Output</div>
              <CodeBlock code={outputCode} />
          </div>
        </div>
      </div>
    </>
  );
}
