import pandas as pd

df = pd.read_csv('data/dataset-tickets-multi-lang-4-20k.csv')
print(f"Total rows: {len(df)}")
print("\nLanguage distribution:")
print(df['language'].value_counts())
print("\nQueue distribution:")
print(df['queue'].value_counts())
print("\nPriority distribution:")
print(df['priority'].value_counts())
