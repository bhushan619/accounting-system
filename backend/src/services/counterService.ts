import Counter from '../models/Counter';

export async function getNextSequence(name: string, prefix: string): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  
  const paddedNumber = String(counter.value).padStart(3, '0');
  return `${prefix}_${paddedNumber}`;
}
