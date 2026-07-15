import os
import psycopg2

DATABASE_URL = "postgresql://postgres.fzjotcnppzdcpncoswew:M7VcfgboPsK2Tvrq@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

print("Trying original URL")
try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Success original URL")
    conn.close()
except Exception as e:
    print("Failed original URL:", e)

print("Trying with sslmode=require")
try:
    conn = psycopg2.connect(DATABASE_URL + "?sslmode=require")
    print("Success sslmode=require")
    conn.close()
except Exception as e:
    print("Failed sslmode=require:", e)

print("Trying direct URL")
DATABASE_URL_DIRECT = "postgresql://postgres.fzjotcnppzdcpncoswew:M7VcfgboPsK2Tvrq@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
try:
    conn = psycopg2.connect(DATABASE_URL_DIRECT)
    print("Success direct URL")
    conn.close()
except Exception as e:
    print("Failed direct URL:", e)

print("Trying direct URL with sslmode=require")
try:
    conn = psycopg2.connect(DATABASE_URL_DIRECT + "?sslmode=require")
    print("Success direct URL sslmode=require")
    conn.close()
except Exception as e:
    print("Failed direct URL sslmode=require:", e)
