--
-- PostgreSQL database dump
--

\restrict 91xg92Kyf8gM8vpu2z8ea4cqxAuXzJpShgLCTGPJcX8QBsLv8fBO9W3ZiAGFEf1

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-06-05 03:35:46

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 257 (class 1255 OID 16509)
-- Name: get_animal_ancestry(character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_animal_ancestry(input_animal_id character varying, max_depth integer DEFAULT 5) RETURNS TABLE(id integer, animal_id character varying, breed character varying, gender character varying, date_of_birth date, sire_id integer, dam_id integer, generation integer, parent_type character varying, tree_path text)
    LANGUAGE sql STABLE
    AS $$
WITH RECURSIVE ancestry AS (
    -- Base animal
    SELECT
        a.id,
        a.animal_id,
        a.breed,
        a.gender,
        a.date_of_birth,
        a.sire_id,
        a.dam_id,
        0 AS generation,
        'SELF' AS parent_type,
        ARRAY[a.id] AS visited_ids,
        LPAD(a.id::TEXT, 5, '0') AS tree_path
    FROM animals a
    WHERE a.animal_id = input_animal_id

    UNION ALL

    -- Recursive parents
    SELECT
        parent.id,
        parent.animal_id,
        parent.breed,
        parent.gender,
        parent.date_of_birth,
        parent.sire_id,
        parent.dam_id,
        an.generation + 1,
        CASE
            WHEN parent.id = child.sire_id THEN 'SIRE'
            WHEN parent.id = child.dam_id THEN 'DAM'
        END,
        an.visited_ids || parent.id,
        an.tree_path || '.' || LPAD(parent.id::TEXT, 5, '0')
    FROM ancestry an
    JOIN animals child ON child.id = an.id
    JOIN animals parent
        ON parent.id = child.sire_id
        OR parent.id = child.dam_id
    WHERE
        an.generation < max_depth
        AND NOT parent.id = ANY(an.visited_ids)
)

SELECT
    id,
    animal_id,
    breed,
    gender,
    date_of_birth,
    sire_id,
    dam_id,
    generation,
    parent_type,
    tree_path
FROM ancestry
ORDER BY tree_path;

$$;

ALTER FUNCTION public.get_animal_ancestry(input_animal_id character varying, max_depth integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.admins (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.admins OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.admins_id_seq OWNER TO postgres;

--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 219
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;

--
-- TOC entry 235 (class 1259 OID 16592)
-- Name: animal_fertility_records; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_fertility_records (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    record_date date NOT NULL,
    fertility_status character varying(50),
    age_at_first_service_months double precision,
    services_per_conception double precision,
    birth_interval_days double precision,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_fertility_records OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16591)
-- Name: animal_fertility_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_fertility_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_fertility_records_id_seq OWNER TO postgres;

--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 234
-- Name: animal_fertility_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_fertility_records_id_seq OWNED BY public.animal_fertility_records.id;

--
-- TOC entry 233 (class 1259 OID 16568)
-- Name: animal_health_records; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_health_records (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    record_date date NOT NULL,
    health_status character varying(50),
    vaccination_status character varying(50),
    disease_history text,
    hereditary_conditions text,
    vet_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_health_records OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16567)
-- Name: animal_health_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_health_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_health_records_id_seq OWNER TO postgres;

--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 232
-- Name: animal_health_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_health_records_id_seq OWNED BY public.animal_health_records.id;

--
-- TOC entry 231 (class 1259 OID 16539)
-- Name: animal_measurements; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_measurements (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    measurement_type character varying(50) DEFAULT 'weight'::character varying NOT NULL,
    value double precision NOT NULL,
    unit character varying(20) DEFAULT 'kg'::character varying NOT NULL,
    measured_at date NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_measurements OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16640)
-- Name: animal_offspring_records; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_offspring_records (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    record_date date NOT NULL,
    offspring_count integer,
    offspring_survival_rate double precision,
    offspring_quality_score double precision,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_offspring_records OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16616)
-- Name: animal_production_records; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_production_records (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    record_date date NOT NULL,
    production_type character varying(50),
    daily_milk_yield double precision,
    milk_fat_percent double precision,
    egg_count_annual integer,
    average_daily_gain double precision,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_production_records OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16435)
-- Name: animals; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animals (
    id integer NOT NULL,
    animal_id character varying(50) NOT NULL,
    animal_type character varying(50) NOT NULL,
    breed character varying(100) NOT NULL,
    gender character varying(10) NOT NULL,
    date_of_birth date NOT NULL,
    sire_id integer,
    dam_id integer,
    breeder_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    CONSTRAINT animals_dob_not_future_chk CHECK ((date_of_birth <= CURRENT_DATE)),
    CONSTRAINT animals_gender_valid_chk CHECK ((lower((gender)::text) = ANY (ARRAY['male'::text, 'female'::text])))
);

-- Updates an existing table structure safely.
ALTER TABLE public.animals OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 24914)
-- Name: animal_latest_profile; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.animal_latest_profile AS
 WITH latest_birth_weight AS (
         SELECT DISTINCT ON (animal_measurements.animal_id) animal_measurements.animal_id,
            animal_measurements.value AS birth_weight
           FROM public.animal_measurements
          WHERE ((animal_measurements.measurement_type)::text = 'birth_weight'::text)
          ORDER BY animal_measurements.animal_id, animal_measurements.measured_at DESC, animal_measurements.id DESC
        ), latest_current_weight AS (
         SELECT DISTINCT ON (animal_measurements.animal_id) animal_measurements.animal_id,
            animal_measurements.value AS current_weight
           FROM public.animal_measurements
          WHERE ((animal_measurements.measurement_type)::text = ANY ((ARRAY['current_weight'::character varying, 'weight'::character varying])::text[]))
          ORDER BY animal_measurements.animal_id, animal_measurements.measured_at DESC, animal_measurements.id DESC
        ), latest_weaning_weight AS (
         SELECT DISTINCT ON (animal_measurements.animal_id) animal_measurements.animal_id,
            animal_measurements.value AS weaning_weight
           FROM public.animal_measurements
          WHERE ((animal_measurements.measurement_type)::text = 'weaning_weight'::text)
          ORDER BY animal_measurements.animal_id, animal_measurements.measured_at DESC, animal_measurements.id DESC
        ), latest_mature_weight AS (
         SELECT DISTINCT ON (animal_measurements.animal_id) animal_measurements.animal_id,
            animal_measurements.value AS mature_weight
           FROM public.animal_measurements
          WHERE ((animal_measurements.measurement_type)::text = 'mature_weight'::text)
          ORDER BY animal_measurements.animal_id, animal_measurements.measured_at DESC, animal_measurements.id DESC
        ), latest_body_condition AS (
         SELECT DISTINCT ON (animal_measurements.animal_id) animal_measurements.animal_id,
            animal_measurements.value AS body_condition_score
           FROM public.animal_measurements
          WHERE ((animal_measurements.measurement_type)::text = 'body_condition_score'::text)
          ORDER BY animal_measurements.animal_id, animal_measurements.measured_at DESC, animal_measurements.id DESC
        ), latest_health AS (
         SELECT DISTINCT ON (animal_health_records.animal_id) animal_health_records.animal_id,
            animal_health_records.health_status,
            animal_health_records.vaccination_status,
            animal_health_records.disease_history,
            animal_health_records.hereditary_conditions,
            animal_health_records.vet_notes
           FROM public.animal_health_records
          ORDER BY animal_health_records.animal_id, animal_health_records.record_date DESC, animal_health_records.id DESC
        ), latest_fertility AS (
         SELECT DISTINCT ON (animal_fertility_records.animal_id) animal_fertility_records.animal_id,
            animal_fertility_records.fertility_status,
            animal_fertility_records.age_at_first_service_months,
            animal_fertility_records.services_per_conception,
            animal_fertility_records.birth_interval_days
           FROM public.animal_fertility_records
          ORDER BY animal_fertility_records.animal_id, animal_fertility_records.record_date DESC, animal_fertility_records.id DESC
        ), latest_production AS (
         SELECT DISTINCT ON (animal_production_records.animal_id) animal_production_records.animal_id,
            animal_production_records.production_type,
            animal_production_records.daily_milk_yield,
            animal_production_records.milk_fat_percent,
            animal_production_records.egg_count_annual,
            animal_production_records.average_daily_gain
           FROM public.animal_production_records
          ORDER BY animal_production_records.animal_id, animal_production_records.record_date DESC, animal_production_records.id DESC
        ), latest_offspring AS (
         SELECT DISTINCT ON (animal_offspring_records.animal_id) animal_offspring_records.animal_id,
            animal_offspring_records.offspring_count,
            animal_offspring_records.offspring_survival_rate,
            animal_offspring_records.offspring_quality_score
           FROM public.animal_offspring_records
          ORDER BY animal_offspring_records.animal_id, animal_offspring_records.record_date DESC, animal_offspring_records.id DESC
        )
 SELECT a.id,
    a.animal_id,
    a.animal_type,
    a.breed,
    a.gender,
    a.date_of_birth,
    a.sire_id,
    a.dam_id,
    a.breeder_id,
    a.created_at,
    a.updated_at,
    bw.birth_weight,
    cw.current_weight,
    ww.weaning_weight,
    mw.mature_weight,
    bc.body_condition_score,
    h.health_status,
    h.vaccination_status,
    h.disease_history,
    h.hereditary_conditions,
    h.vet_notes,
    f.fertility_status,
    f.age_at_first_service_months,
    f.services_per_conception,
    f.birth_interval_days,
    p.average_daily_gain,
    p.production_type,
    p.daily_milk_yield,
    p.milk_fat_percent,
    p.egg_count_annual,
    o.offspring_count,
    o.offspring_survival_rate,
    o.offspring_quality_score
   FROM (((((((((public.animals a
     LEFT JOIN latest_birth_weight bw ON ((bw.animal_id = a.id)))
     LEFT JOIN latest_current_weight cw ON ((cw.animal_id = a.id)))
     LEFT JOIN latest_weaning_weight ww ON ((ww.animal_id = a.id)))
     LEFT JOIN latest_mature_weight mw ON ((mw.animal_id = a.id)))
     LEFT JOIN latest_body_condition bc ON ((bc.animal_id = a.id)))
     LEFT JOIN latest_health h ON ((h.animal_id = a.id)))
     LEFT JOIN latest_fertility f ON ((f.animal_id = a.id)))
     LEFT JOIN latest_production p ON ((p.animal_id = a.id)))
     LEFT JOIN latest_offspring o ON ((o.animal_id = a.id)));

ALTER VIEW public.animal_latest_profile OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16538)
-- Name: animal_measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_measurements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_measurements_id_seq OWNER TO postgres;

--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 230
-- Name: animal_measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_measurements_id_seq OWNED BY public.animal_measurements.id;

--
-- TOC entry 241 (class 1259 OID 16664)
-- Name: animal_notes; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.animal_notes (
    id integer NOT NULL,
    animal_id integer NOT NULL,
    breeder_id integer NOT NULL,
    note_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.animal_notes OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16663)
-- Name: animal_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_notes_id_seq OWNER TO postgres;

--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 240
-- Name: animal_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_notes_id_seq OWNED BY public.animal_notes.id;

--
-- TOC entry 238 (class 1259 OID 16639)
-- Name: animal_offspring_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_offspring_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_offspring_records_id_seq OWNER TO postgres;

--
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 238
-- Name: animal_offspring_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_offspring_records_id_seq OWNED BY public.animal_offspring_records.id;

--
-- TOC entry 236 (class 1259 OID 16615)
-- Name: animal_production_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animal_production_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animal_production_records_id_seq OWNER TO postgres;

--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 236
-- Name: animal_production_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animal_production_records_id_seq OWNED BY public.animal_production_records.id;

--
-- TOC entry 223 (class 1259 OID 16434)
-- Name: animals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.animals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.animals_id_seq OWNER TO postgres;

--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 223
-- Name: animals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.animals_id_seq OWNED BY public.animals.id;

--
-- TOC entry 229 (class 1259 OID 16522)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id integer NOT NULL,
    actor_name character varying(255),
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id integer,
    detail text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16521)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 228
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;

--
-- TOC entry 222 (class 1259 OID 16407)
-- Name: breeders; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.breeders (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    national_id character varying(100) NOT NULL,
    animal_type character varying(50) NOT NULL,
    farm_name character varying(255),
    farm_prefix character varying(100),
    farm_location character varying(255) NOT NULL,
    county character varying(100),
    phone character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(50) DEFAULT 'breeder'::character varying,
    documents character varying(500),
    rejected_by integer,
    rejected_at timestamp without time zone
);

-- Updates an existing table structure safely.
ALTER TABLE public.breeders OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16515)
-- Name: breed_farm_profiles; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.breed_farm_profiles AS
 SELECT b.id AS breeder_id,
    b.full_name AS breeder_name,
    b.farm_name,
    b.farm_prefix,
    b.farm_location AS location,
    b.county,
    b.phone,
    b.email,
    b.status,
    b.created_at AS member_since,
    count(a.id) AS animals_registered,
    string_agg(DISTINCT (a.breed)::text, ', '::text) AS breeds
   FROM (public.breeders b
     JOIN public.animals a ON ((a.breeder_id = b.id)))
  GROUP BY b.id, b.full_name, b.farm_name, b.farm_prefix, b.farm_location, b.county, b.phone, b.email, b.status, b.created_at;

ALTER VIEW public.breed_farm_profiles OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16406)
-- Name: breeders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.breeders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.breeders_id_seq OWNER TO postgres;

--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 221
-- Name: breeders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.breeders_id_seq OWNED BY public.breeders.id;

--
-- TOC entry 226 (class 1259 OID 16467)
-- Name: breeding_events; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.breeding_events (
    id integer NOT NULL,
    breeding_method character varying(50) NOT NULL,
    dam_id integer NOT NULL,
    sire_id integer,
    breeding_date date NOT NULL,
    expected_due_date date,
    offspring_id integer,
    semen_source character varying(255),
    ai_technician character varying(255),
    batch_number character varying(100),
    donor_dam character varying(255),
    embryo_id character varying(100),
    notes text,
    breeder_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'served'::character varying NOT NULL,
    pregnancy_confirmed boolean DEFAULT false NOT NULL,
    pregnancy_check_date date,
    outcome character varying(50),
    outcome_date date,
    offspring_count integer,
    live_offspring_count integer,
    outcome_notes text,
    updated_at timestamp without time zone,
    CONSTRAINT breeding_events_dates_valid_chk CHECK (((expected_due_date IS NULL) OR (expected_due_date >= breeding_date))),
    CONSTRAINT breeding_events_outcome_valid_chk CHECK (((outcome IS NULL) OR ((outcome)::text = ANY ((ARRAY['live_birth'::character varying, 'failed_conception'::character varying, 'miscarriage'::character varying, 'stillbirth'::character varying, 'abortion'::character varying, 'unknown'::character varying])::text[])))),
    CONSTRAINT breeding_events_status_valid_chk CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'served'::character varying, 'confirmed_pregnant'::character varying, 'not_pregnant'::character varying, 'failed'::character varying, 'lost'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);

-- Updates an existing table structure safely.
ALTER TABLE public.breeding_events OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16466)
-- Name: breeding_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.breeding_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.breeding_events_id_seq OWNER TO postgres;

--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 225
-- Name: breeding_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.breeding_events_id_seq OWNED BY public.breeding_events.id;

--
-- TOC entry 243 (class 1259 OID 16714)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    breeder_id integer NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16713)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 242
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;

--
-- TOC entry 244 (class 1259 OID 24905)
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

-- Creates a database table used by the application.
CREATE TABLE public.schema_migrations (
    migration_key text NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Updates an existing table structure safely.
ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- TOC entry 4924 (class 2604 OID 16393)
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);

--
-- TOC entry 4945 (class 2604 OID 16595)
-- Name: animal_fertility_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_fertility_records ALTER COLUMN id SET DEFAULT nextval('public.animal_fertility_records_id_seq'::regclass);

--
-- TOC entry 4943 (class 2604 OID 16571)
-- Name: animal_health_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_health_records ALTER COLUMN id SET DEFAULT nextval('public.animal_health_records_id_seq'::regclass);

--
-- TOC entry 4939 (class 2604 OID 16542)
-- Name: animal_measurements id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_measurements ALTER COLUMN id SET DEFAULT nextval('public.animal_measurements_id_seq'::regclass);

--
-- TOC entry 4951 (class 2604 OID 16667)
-- Name: animal_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_notes ALTER COLUMN id SET DEFAULT nextval('public.animal_notes_id_seq'::regclass);

--
-- TOC entry 4949 (class 2604 OID 16643)
-- Name: animal_offspring_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_offspring_records ALTER COLUMN id SET DEFAULT nextval('public.animal_offspring_records_id_seq'::regclass);

--
-- TOC entry 4947 (class 2604 OID 16619)
-- Name: animal_production_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_production_records ALTER COLUMN id SET DEFAULT nextval('public.animal_production_records_id_seq'::regclass);

--
-- TOC entry 4931 (class 2604 OID 16438)
-- Name: animals id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animals ALTER COLUMN id SET DEFAULT nextval('public.animals_id_seq'::regclass);

--
-- TOC entry 4937 (class 2604 OID 16525)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);

--
-- TOC entry 4927 (class 2604 OID 16410)
-- Name: breeders id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeders ALTER COLUMN id SET DEFAULT nextval('public.breeders_id_seq'::regclass);

--
-- TOC entry 4933 (class 2604 OID 16470)
-- Name: breeding_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events ALTER COLUMN id SET DEFAULT nextval('public.breeding_events_id_seq'::regclass);

--
-- TOC entry 4954 (class 2604 OID 16717)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);

--
-- TOC entry 5194 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, full_name, email, password_hash, role, created_at) FROM stdin;
1	Super Admin	admin@breedery.com	$2b$12$7QmRsz0fvC426jRU.qTr7eyd4dgZOzokrgiM57Jm06bRrq8NqXCdW	admin	2026-02-19 11:24:02.280087
2	ABRS System Administrator	admin@abrs.test	$2b$12$PaY6HkSJtd2rc5YYVOVI1ud5Cr32PZjm4T5DNspcg9blvLZyXOtly	admin	2026-05-23 12:46:42.545749
\.

--
-- TOC entry 5208 (class 0 OID 16592)
-- Dependencies: 235
-- Data for Name: animal_fertility_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_fertility_records (id, animal_id, breeder_id, record_date, fertility_status, age_at_first_service_months, services_per_conception, birth_interval_days, notes, created_at) FROM stdin;
1	1	1	2026-05-05	failed conception recorded	\N	\N	\N	Auto-linked from breeding event #1	2026-05-05 16:32:15.904445
2	1	1	2026-05-05	failed conception recorded	\N	\N	\N	Auto-linked from breeding event #2	2026-05-05 16:33:49.975786
3	1	1	2026-05-05	failed conception recorded	\N	\N	\N	Auto-linked from breeding event #3	2026-05-05 16:34:14.521475
4	1	1	2026-05-05	pregnancy loss recorded	\N	\N	\N	Auto-linked from breeding event #4	2026-05-05 16:34:21.852785
5	15	3	2026-04-01	proven	19	1.2	\N	High conception history	2026-05-23 12:46:42.545749
6	16	3	2026-04-01	fertile	20	1.5	389	Regular calving interval	2026-05-23 12:46:42.545749
7	16	3	2026-06-04	failed conception recorded	\N	\N	\N	Auto-linked from breeding event #6	2026-06-05 01:11:34.574229
8	16	3	2026-06-04	proven fertile	\N	\N	\N	Auto-linked from breeding event #7	2026-06-05 01:11:45.07953
9	11	3	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
10	12	3	2026-06-05	fertile	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
11	13	3	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
12	14	3	2026-06-05	fertile	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
13	15	3	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
14	16	3	2026-06-05	fertile	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
15	17	3	2026-06-05	not_served	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
16	18	3	2026-06-05	developing	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
17	19	3	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
18	20	4	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
19	21	4	2026-06-05	fertile	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
20	22	4	2026-06-05	young	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
21	23	5	2026-06-05	active	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
22	24	5	2026-06-05	laying	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
23	26	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
24	27	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
25	28	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
26	29	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
27	30	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
28	31	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
29	32	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
30	33	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
31	34	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
32	35	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
33	36	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
34	37	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
35	38	8	2026-06-05	proven	\N	\N	\N	Migrated from animals fertility summary columns	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5206 (class 0 OID 16568)
-- Dependencies: 233
-- Data for Name: animal_health_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_health_records (id, animal_id, breeder_id, record_date, health_status, vaccination_status, disease_history, hereditary_conditions, vet_notes, created_at) FROM stdin;
1	11	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
2	12	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
3	15	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
4	16	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
5	17	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
6	18	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
7	19	3	2026-04-22	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
8	20	4	2026-04-19	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
9	21	4	2026-04-19	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
10	22	4	2026-04-19	healthy	up_to_date	None recorded	None recorded	Routine check completed	2026-05-23 12:46:42.545749
11	11	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
12	12	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
13	13	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
14	14	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
15	15	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
16	16	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
17	17	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
18	18	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
19	19	3	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
20	20	4	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
21	21	4	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
22	22	4	2026-06-05	healthy	partial	\N	\N	\N	2026-06-05 02:16:52.375573
23	23	5	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
24	24	5	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
25	25	5	2026-06-05	healthy	partial	\N	\N	\N	2026-06-05 02:16:52.375573
26	26	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
27	27	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
28	28	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
29	29	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
30	30	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
31	31	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
32	32	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
33	33	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
34	34	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
35	35	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
36	36	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
37	37	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
38	38	8	2026-06-05	healthy	up_to_date	\N	\N	\N	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5204 (class 0 OID 16539)
-- Dependencies: 231
-- Data for Name: animal_measurements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_measurements (id, animal_id, breeder_id, measurement_type, value, unit, measured_at, notes, created_at) FROM stdin;
1	11	3	weight	795	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
2	11	3	weight	820	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
3	12	3	weight	585	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
4	12	3	weight	610	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
5	15	3	weight	760	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
6	15	3	weight	785	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
7	16	3	weight	570	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
8	16	3	weight	595	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
9	17	3	weight	260	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
10	17	3	weight	285	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
11	18	3	weight	315	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
12	18	3	weight	340	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
13	19	3	weight	655	kg	2025-11-10	Previous weight for trend testing	2026-05-23 12:46:42.545749
14	19	3	weight	680	kg	2026-04-20	Latest weight for profile display	2026-05-23 12:46:42.545749
15	20	4	weight	72	kg	2026-04-18	Goat demo weight	2026-05-23 12:46:42.545749
16	21	4	weight	55	kg	2026-04-18	Goat demo weight	2026-05-23 12:46:42.545749
17	22	4	weight	28	kg	2026-04-18	Goat demo weight	2026-05-23 12:46:42.545749
18	11	3	birth_weight	38	kg	2018-02-14	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
19	12	3	birth_weight	34	kg	2018-05-20	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
20	13	3	birth_weight	36	kg	2017-09-12	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
21	14	3	birth_weight	32	kg	2018-07-08	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
22	15	3	birth_weight	39	kg	2020-04-04	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
23	16	3	birth_weight	33	kg	2020-06-18	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
24	17	3	birth_weight	35	kg	2024-02-09	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
25	18	3	birth_weight	37	kg	2023-11-02	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
26	19	3	birth_weight	30	kg	2019-01-25	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
27	20	4	birth_weight	3.1	kg	2021-08-11	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
28	21	4	birth_weight	2.8	kg	2022-03-05	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
29	22	4	birth_weight	2.9	kg	2025-08-09	Migrated from animals.birth_weight	2026-06-05 02:16:52.375573
30	36	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
31	26	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
32	28	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
33	30	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
34	35	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
35	34	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
36	38	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
37	25	5	current_weight	1.2	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
38	23	5	current_weight	3.1	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
39	27	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
40	14	3	current_weight	560	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
41	31	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
42	33	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
43	24	5	current_weight	2.4	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
44	13	3	current_weight	760	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
45	32	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
46	37	8	current_weight	700	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
47	29	8	current_weight	500	kg	2026-06-05	Migrated from animals.current_weight	2026-06-05 02:16:52.375573
48	17	3	weaning_weight	105	kg	2026-06-05	Migrated from animals.weaning_weight	2026-06-05 02:16:52.375573
49	18	3	weaning_weight	115	kg	2026-06-05	Migrated from animals.weaning_weight	2026-06-05 02:16:52.375573
50	11	3	mature_weight	850	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
51	12	3	mature_weight	640	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
52	13	3	mature_weight	790	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
53	14	3	mature_weight	590	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
54	15	3	mature_weight	820	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
55	16	3	mature_weight	620	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
56	19	3	mature_weight	700	kg	2026-06-05	Migrated from animals.mature_weight	2026-06-05 02:16:52.375573
57	11	3	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
58	12	3	body_condition_score	3.7	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
59	13	3	body_condition_score	3.8	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
60	14	3	body_condition_score	3.5	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
61	15	3	body_condition_score	4.2	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
62	16	3	body_condition_score	3.6	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
63	17	3	body_condition_score	3.4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
64	18	3	body_condition_score	3.8	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
65	19	3	body_condition_score	4.1	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
66	20	4	body_condition_score	3.7	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
67	21	4	body_condition_score	3.5	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
68	22	4	body_condition_score	3.4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
69	26	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
70	27	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
71	28	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
72	29	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
73	30	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
74	31	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
75	32	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
76	33	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
77	34	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
78	35	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
79	36	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
80	37	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
81	38	8	body_condition_score	4	score	2026-06-05	Migrated from animals.body_condition_score	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5214 (class 0 OID 16664)
-- Dependencies: 241
-- Data for Name: animal_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_notes (id, animal_id, breeder_id, note_type, note, created_at) FROM stdin;
1	11	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
2	12	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
3	15	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
4	16	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
5	17	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
6	18	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
7	19	3	management	Demo record: verify animal profile, reports and genetics scoring.	2026-05-23 12:46:42.545749
8	20	4	demo	Used for multi-species testing.	2026-05-23 12:46:42.545749
9	21	4	demo	Used for multi-species testing.	2026-05-23 12:46:42.545749
10	22	4	demo	Used for multi-species testing.	2026-05-23 12:46:42.545749
\.

--
-- TOC entry 5212 (class 0 OID 16640)
-- Dependencies: 239
-- Data for Name: animal_offspring_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_offspring_records (id, animal_id, breeder_id, record_date, offspring_count, offspring_survival_rate, offspring_quality_score, notes, created_at) FROM stdin;
1	15	3	2026-04-20	12	97	93	Used for recommendation engine scoring	2026-05-23 12:46:42.545749
2	16	3	2026-04-20	2	100	90	Two offspring recorded	2026-05-23 12:46:42.545749
3	16	3	2026-06-04	1	100	\N	Auto-linked from breeding event #7	2026-06-05 01:11:45.07953
4	11	3	2026-06-05	28	96	91	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
5	13	3	2026-06-05	20	94	88	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
6	15	3	2026-06-05	12	97	93	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
7	19	3	2026-06-05	35	98	95	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
8	20	4	2026-06-05	18	92	86	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
9	26	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
10	27	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
11	28	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
12	29	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
13	30	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
14	31	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
15	32	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
16	33	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
17	34	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
18	35	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
19	36	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
20	37	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
21	38	8	2026-06-05	3	95	85	Migrated from animals offspring summary columns	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5210 (class 0 OID 16616)
-- Dependencies: 237
-- Data for Name: animal_production_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animal_production_records (id, animal_id, breeder_id, record_date, production_type, daily_milk_yield, milk_fat_percent, egg_count_annual, average_daily_gain, notes, created_at) FROM stdin;
1	16	3	2026-04-20	milk	21	4	\N	\N	Production record for testing reports and recommendations	2026-05-23 12:46:42.545749
2	12	3	2026-04-20	milk	25.2	3.9	\N	\N	Production record for testing reports and recommendations	2026-05-23 12:46:42.545749
3	24	5	2026-04-15	eggs	\N	\N	\N	\N	Annual egg estimate: 210 eggs	2026-05-23 12:46:42.545749
4	11	3	2026-06-05	breeding	\N	\N	\N	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
5	12	3	2026-06-05	\N	25.2	3.9	\N	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
6	14	3	2026-06-05	\N	18.4	4.1	\N	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
7	16	3	2026-06-05	\N	21	4	\N	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
8	21	4	2026-06-05	\N	3.2	3.5	\N	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
9	24	5	2026-06-05	\N	\N	\N	210	\N	Migrated from animals production summary columns	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5198 (class 0 OID 16435)
-- Dependencies: 224
-- Data for Name: animals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.animals (id, animal_id, animal_type, breed, gender, date_of_birth, sire_id, dam_id, breeder_id, created_at, updated_at) FROM stdin;
1	RMU-001	cattle	jersey	female	2026-02-12	\N	\N	1	2026-02-26 11:19:21.397181	\N
3	RMU-002	cattle	angus	male	2026-02-26	\N	1	1	2026-02-27 10:59:59.708586	\N
5	RMU-003	cattle	hereford	male	2023-07-27	\N	\N	1	2026-02-27 12:03:50.500148	\N
7	RMU-004	cattle	ayrshire	female	2024-07-27	\N	\N	1	2026-02-27 12:21:45.399631	\N
9	RMU-005	cattle	hereford	male	2025-12-31	5	1	1	2026-02-27 12:45:09.893257	\N
11	GVD-001	cattle	Holstein Friesian	male	2018-02-14	\N	\N	3	2026-05-23 12:46:42.545749	\N
12	GVD-002	cattle	Holstein Friesian	female	2018-05-20	\N	\N	3	2026-05-23 12:46:42.545749	\N
13	GVD-003	cattle	Ayrshire	male	2017-09-12	\N	\N	3	2026-05-23 12:46:42.545749	\N
14	GVD-004	cattle	Ayrshire	female	2018-07-08	\N	\N	3	2026-05-23 12:46:42.545749	\N
15	GVD-005	cattle	Holstein Friesian	male	2020-04-04	11	12	3	2026-05-23 12:46:42.545749	\N
16	GVD-006	cattle	Ayrshire	female	2020-06-18	13	14	3	2026-05-23 12:46:42.545749	\N
17	GVD-007	cattle	Ayrshire-Friesian Cross	female	2024-02-09	15	16	3	2026-05-23 12:46:42.545749	\N
18	GVD-008	cattle	Holstein Friesian	male	2023-11-02	15	16	3	2026-05-23 12:46:42.545749	\N
19	GVD-009	cattle	Jersey	male	2019-01-25	\N	\N	3	2026-05-23 12:46:42.545749	\N
20	NDG-001	goat	Toggenburg	male	2021-08-11	\N	\N	4	2026-05-23 12:46:42.545749	\N
21	NDG-002	goat	Alpine	female	2022-03-05	\N	\N	4	2026-05-23 12:46:42.545749	\N
22	NDG-003	goat	Toggenburg-Alpine Cross	female	2025-08-09	20	21	4	2026-05-23 12:46:42.545749	\N
23	RLF-001	poultry	KARI Improved Kienyeji	male	2025-01-05	\N	\N	5	2026-05-23 12:46:42.545749	\N
24	RLF-002	poultry	KARI Improved Kienyeji	female	2025-02-02	\N	\N	5	2026-05-23 12:46:42.545749	\N
25	RLF-003	poultry	KARI Improved Kienyeji	female	2026-01-10	23	24	5	2026-05-23 12:46:42.545749	\N
26	GVF-F1	cattle	Validation Breed	male	2020-01-01	\N	\N	8	2026-05-23 13:25:27.262091	\N
27	GVF-F2	cattle	Validation Breed	female	2020-01-01	\N	\N	8	2026-05-23 13:25:27.262091	\N
28	GVF-F3	cattle	Validation Breed	male	2020-01-01	\N	\N	8	2026-05-23 13:25:27.262091	\N
29	GVF-F4	cattle	Validation Breed	female	2020-01-01	\N	\N	8	2026-05-23 13:25:27.262091	\N
30	GVF-SIB-M	cattle	Validation Breed	male	2020-01-01	26	27	8	2026-05-23 13:25:27.262091	\N
31	GVF-SIB-F	cattle	Validation Breed	female	2020-01-01	26	27	8	2026-05-23 13:25:27.262091	\N
32	GVF-HALF-M	cattle	Validation Breed	male	2020-01-01	26	27	8	2026-05-23 13:25:27.262091	\N
33	GVF-HALF-F	cattle	Validation Breed	female	2020-01-01	26	29	8	2026-05-23 13:25:27.262091	\N
34	GVF-UNREL-M	cattle	Validation Breed	male	2020-01-01	28	29	8	2026-05-23 13:25:27.262091	\N
35	GVF-UNREL-F	cattle	Validation Breed	female	2020-01-01	26	27	8	2026-05-23 13:25:27.262091	\N
36	GVF-OTHER-DAM	cattle	Validation Breed	female	2020-01-01	\N	\N	8	2026-05-23 13:25:27.262091	\N
37	GVF-CHILD-M	cattle	Validation Breed	male	2020-01-01	26	27	8	2026-05-23 13:25:27.262091	\N
38	GVF-GRANDCHILD-F	cattle	Validation Breed	female	2020-01-01	37	36	8	2026-05-23 13:25:27.262091	\N
\.

--
-- TOC entry 5202 (class 0 OID 16522)
-- Dependencies: 229
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, actor_type, actor_id, actor_name, action, target_type, target_id, detail, created_at) FROM stdin;
1	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-05 17:33:00.634362
2	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-05 20:15:01.687209
3	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-05 21:49:48.491143
4	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-23 12:20:42.694717
5	admin	2	ABRS System Administrator	APPROVE_BREEDER	Breeder	3	Approved demo breeder Peter Mwangi	2026-05-23 12:46:42.545749
6	admin	2	ABRS System Administrator	APPROVE_BREEDER	Breeder	4	Approved demo breeder Grace Akinyi	2026-05-23 12:46:42.545749
7	admin	2	ABRS System Administrator	APPROVE_BREEDER	Breeder	5	Approved demo breeder Daniel Cheruiyot	2026-05-23 12:46:42.545749
8	admin	2	ABRS System Administrator	REJECT_BREEDER	Breeder	7	Rejected due to incomplete documents	2026-05-23 12:46:42.545749
9	breeder	3	Demo Breeder	CREATE_ANIMAL	Animal	17	Created demo animal GVD-007	2026-05-23 12:46:42.545749
10	breeder	4	Demo Breeder	CREATE_ANIMAL	Animal	22	Created demo animal NDG-003	2026-05-23 12:46:42.545749
11	breeder	5	Demo Breeder	CREATE_ANIMAL	Animal	25	Created demo animal RLF-003	2026-05-23 12:46:42.545749
12	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-05-23 12:48:28.709901
13	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-23 14:38:38.622913
14	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-05-23 15:38:55.332477
15	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-06-04 00:45:08.742771
16	breeder	1	Richard Mutemi	BREEDER_LOGIN	Breeder	1	\N	2026-06-04 00:45:24.688851
17	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-04 00:49:27.17408
18	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-04 23:01:27.579846
19	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-05 00:04:03.984981
20	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-05 01:04:07.105734
21	breeder	3	Peter Mwangi	UPDATE_BREEDING_EVENT	BreedingEvent	6	{"status": "failed", "outcome": "failed_conception"}	2026-06-05 01:11:34.605127
22	breeder	3	Peter Mwangi	UPDATE_BREEDING_EVENT	BreedingEvent	7	{"status": "confirmed_pregnant", "outcome": null}	2026-06-05 01:11:37.603482
23	breeder	3	Peter Mwangi	UPDATE_BREEDING_EVENT	BreedingEvent	7	{"status": "completed", "outcome": "live_birth"}	2026-06-05 01:11:45.113665
24	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-05 01:14:09.363035
25	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-05 01:16:25.712929
26	breeder	3	Peter Mwangi	BREEDER_LOGIN	Breeder	3	\N	2026-06-05 02:18:05.54596
\.

--
-- TOC entry 5196 (class 0 OID 16407)
-- Dependencies: 222
-- Data for Name: breeders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.breeders (id, full_name, national_id, animal_type, farm_name, farm_prefix, farm_location, county, phone, email, password_hash, status, approved_by, approved_at, created_at, role, documents, rejected_by, rejected_at) FROM stdin;
2	Elic macharia	11223345	dog	Green Park Farm	EMA	izinga	Garissa	0121877933	mazinga54@gmail.com	$2b$12$HU7bV677ptPtJon4iyFcLuJIZTVar6e4ZhGUQO868aib/OJXPmR7u	approved	1	2026-04-02 06:36:13.671268	2026-02-19 15:33:35.493719	breeder	\N	\N	\N
1	Richard Mutemi	11223344	cattle	Green Park Farm	RMU	Malewa	Naivasha	0111877921	bandi@gmail.com	$2b$12$83ibNgdugiAgXLkdcNtyZ.PtZCqVCNngceg6XIgj4kHRXiBU9Seqa	approved	1	2026-02-19 08:25:15.454463	2026-02-19 11:17:31.507409	breeder	\N	\N	\N
3	Peter Mwangi	ABRS-NID-1001	cattle	Green Valley Dairy Farm	GVD	Limuru	Kiambu	+254711100001	mwangi@abrs.test	$2b$12$rxd7mgRvmKNxqIM90UT2tudiOw/iRJiTL0NUQyT21sYenvJLQgaYy	approved	2	2026-05-23 12:46:42.883742	2026-05-23 12:46:42.545749	breeder	pedigree_certificate_gvd.pdf	\N	\N
4	Grace Akinyi	ABRS-NID-1002	goat	Nyanza Dairy Goats	NDG	Kisumu West	Kisumu	+254722100002	akinyi@abrs.test	$2b$12$9KCdO1xU.ncD23lgMuUUXOqp49h0Pqn3XV/BtQ5Nr5wwu3pjWDSOO	approved	2	2026-05-23 12:46:43.188111	2026-05-23 12:46:42.545749	breeder	goat_breeder_membership.pdf	\N	\N
5	Daniel Cheruiyot	ABRS-NID-1003	poultry	Rift Layers Farm	RLF	Eldoret	Uasin Gishu	+254733100003	cheruiyot@abrs.test	$2b$12$zI3c4TUofvR.ZuW5IUD/LugXoRXMOYMLe9HAlLCBJ69EqoZZV30DS	approved	2	2026-05-23 12:46:43.495705	2026-05-23 12:46:42.545749	breeder	farm_inspection_note.pdf	\N	\N
6	Mary Wanjiku	ABRS-NID-1004	cattle	Aberdare Heifers	ABH	Nyeri	Nyeri	+254744100004	pending@abrs.test	$2b$12$34CfanBmQKvJHejbPLJO5.Mgqo34ayPD96Li5p4z/AR5AZMS1I.3y	pending	\N	\N	2026-05-23 12:46:42.545749	breeder	awaiting_review.pdf	\N	\N
7	Joseph Otieno	ABRS-NID-1005	pig	Lakeview Piggery	LVP	Homa Bay	Homa Bay	+254755100005	rejected@abrs.test	$2b$12$uUGGLiUbcI9nPgDAdTi22egj4toQZeQkIkJqciskrQC1.xz4jaczS	rejected	\N	\N	2026-05-23 12:46:42.545749	breeder	incomplete_documents.pdf	2	2026-05-23 12:46:44.200226
8	Genetics Validation Breeder	ABRS-GEN-VALIDATION	cattle	Genetics Validation Farm	GVF	Test County	Test County	+254700000999	genetics.validation@abrs.test	not_used_for_validation	approved	\N	\N	2026-05-23 13:25:27.262091	breeder	\N	\N	\N
\.

--
-- TOC entry 5200 (class 0 OID 16467)
-- Dependencies: 226
-- Data for Name: breeding_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.breeding_events (id, breeding_method, dam_id, sire_id, breeding_date, expected_due_date, offspring_id, semen_source, ai_technician, batch_number, donor_dam, embryo_id, notes, breeder_id, created_at, status, pregnancy_confirmed, pregnancy_check_date, outcome, outcome_date, offspring_count, live_offspring_count, outcome_notes, updated_at) FROM stdin;
1	natural	1	\N	2026-02-25	\N	\N	\N	\N	\N	\N	\N	\N	1	2026-02-26 17:44:30.323851	failed	f	\N	failed_conception	2026-05-05	\N	\N	\N	2026-05-05 16:32:15.861851
2	natural	1	\N	2026-02-25	2026-02-25	\N	\N	\N	\N	\N	\N	\N	1	2026-02-26 17:45:59.67829	failed	f	\N	failed_conception	2026-05-05	\N	\N	\N	2026-05-05 16:33:49.911638
3	natural	1	\N	2026-02-12	2026-03-13	\N	\N	\N	\N	\N	\N	\N	1	2026-02-26 18:00:58.795534	failed	f	\N	failed_conception	2026-05-05	\N	\N	\N	2026-05-05 16:34:14.51111
4	ai	1	\N	2025-08-12	2026-02-26	\N	\N	Dr Mutua	GENEX12	\N	\N	\N	1	2026-02-27 10:58:41.743174	lost	t	2026-05-05	miscarriage	2026-05-05	\N	\N	\N	2026-05-05 16:34:21.84949
5	artificial_insemination	16	15	2023-05-03	2024-02-10	17	KLBA demo semen bank	Tech A. Kariuki	AI-HF-2023-05	\N	\N	Successful AI event	3	2026-05-23 12:46:42.545749	completed	t	2023-06-10	live_birth	2024-02-09	1	1	Healthy female calf born	\N
8	artificial_insemination	12	15	2025-01-16	2025-10-26	\N	\N	\N	\N	\N	\N	Negative pregnancy check	3	2026-05-23 12:46:42.545749	failed	f	2025-02-25	failed_conception	2025-02-25	0	0	Used to test failed breeding analytics	\N
9	natural	21	20	2025-03-12	2025-08-09	22	\N	\N	\N	\N	\N	Successful goat breeding event	4	2026-05-23 12:46:42.545749	completed	t	2025-04-20	live_birth	2025-08-09	2	2	Twin kids, one demo record registered	\N
10	natural	24	23	2025-12-20	2026-01-10	25	\N	\N	\N	\N	\N	Hatching event	5	2026-05-23 12:46:42.545749	completed	f	\N	live_birth	2026-01-10	8	7	Seven chicks survived	\N
6	natural	16	18	2025-09-12	2026-06-22	\N	\N	\N	\N	\N	\N	Pregnancy monitoring test event	3	2026-05-23 12:46:42.545749	failed	f	2025-10-15	failed_conception	2026-06-04	\N	\N	\N	2026-06-05 01:11:34.510093
7	artificial_insemination	16	19	2026-03-02	2026-12-10	\N	Jersey semen batch	Tech M. Njoroge	JER-2026-03	\N	\N	Open/served state test	3	2026-05-23 12:46:42.545749	completed	t	2026-06-05	live_birth	2026-06-04	1	1	\N	2026-06-05 01:11:45.006222
\.

--
-- TOC entry 5216 (class 0 OID 16714)
-- Dependencies: 243
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, breeder_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.

--
-- TOC entry 5217 (class 0 OID 24905)
-- Dependencies: 244
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_migrations (migration_key, applied_at) FROM stdin;
2026_06_normalize_animals_table	2026-06-05 02:16:52.375573
\.

--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 219
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admins_id_seq', 2, true);

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 234
-- Name: animal_fertility_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_fertility_records_id_seq', 35, true);

--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 232
-- Name: animal_health_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_health_records_id_seq', 38, true);

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 230
-- Name: animal_measurements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_measurements_id_seq', 81, true);

--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 240
-- Name: animal_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_notes_id_seq', 10, true);

--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 238
-- Name: animal_offspring_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_offspring_records_id_seq', 21, true);

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 236
-- Name: animal_production_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animal_production_records_id_seq', 9, true);

--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 223
-- Name: animals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.animals_id_seq', 38, true);

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 228
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 26, true);

--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 221
-- Name: breeders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.breeders_id_seq', 8, true);

--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 225
-- Name: breeding_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.breeding_events_id_seq', 10, true);

--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 242
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);

--
-- TOC entry 4963 (class 2606 OID 16403)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);

--
-- TOC entry 5002 (class 2606 OID 16604)
-- Name: animal_fertility_records animal_fertility_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_fertility_records
    ADD CONSTRAINT animal_fertility_records_pkey PRIMARY KEY (id);

--
-- TOC entry 4999 (class 2606 OID 16580)
-- Name: animal_health_records animal_health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_health_records
    ADD CONSTRAINT animal_health_records_pkey PRIMARY KEY (id);

--
-- TOC entry 4995 (class 2606 OID 16556)
-- Name: animal_measurements animal_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_measurements
    ADD CONSTRAINT animal_measurements_pkey PRIMARY KEY (id);

--
-- TOC entry 5011 (class 2606 OID 16678)
-- Name: animal_notes animal_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_notes
    ADD CONSTRAINT animal_notes_pkey PRIMARY KEY (id);

--
-- TOC entry 5008 (class 2606 OID 16652)
-- Name: animal_offspring_records animal_offspring_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_offspring_records
    ADD CONSTRAINT animal_offspring_records_pkey PRIMARY KEY (id);

--
-- TOC entry 5005 (class 2606 OID 16628)
-- Name: animal_production_records animal_production_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_production_records
    ADD CONSTRAINT animal_production_records_pkey PRIMARY KEY (id);

--
-- TOC entry 4972 (class 2606 OID 16448)
-- Name: animals animals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_pkey PRIMARY KEY (id);

--
-- TOC entry 4989 (class 2606 OID 16534)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- TOC entry 4967 (class 2606 OID 16425)
-- Name: breeders breeders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeders
    ADD CONSTRAINT breeders_pkey PRIMARY KEY (id);

--
-- TOC entry 4981 (class 2606 OID 16480)
-- Name: breeding_events breeding_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events
    ADD CONSTRAINT breeding_events_pkey PRIMARY KEY (id);

--
-- TOC entry 5020 (class 2606 OID 16724)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

--
-- TOC entry 5022 (class 2606 OID 24913)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (migration_key);

--
-- TOC entry 4973 (class 1259 OID 16520)
-- Name: idx_animal_id_upper; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animal_id_upper ON public.animals USING btree (upper((animal_id)::text));

--
-- TOC entry 4996 (class 1259 OID 16702)
-- Name: idx_animal_measurements_animal_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animal_measurements_animal_date ON public.animal_measurements USING btree (animal_id, measured_at DESC);

--
-- TOC entry 4997 (class 1259 OID 16703)
-- Name: idx_animal_measurements_breeder; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animal_measurements_breeder ON public.animal_measurements USING btree (breeder_id);

--
-- TOC entry 5012 (class 1259 OID 16708)
-- Name: idx_animal_notes_animal_created; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animal_notes_animal_created ON public.animal_notes USING btree (animal_id, created_at DESC);

--
-- TOC entry 4974 (class 1259 OID 16699)
-- Name: idx_animals_breeder_type; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animals_breeder_type ON public.animals USING btree (breeder_id, animal_type);

--
-- TOC entry 4975 (class 1259 OID 16701)
-- Name: idx_animals_dam_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animals_dam_id ON public.animals USING btree (dam_id);

--
-- TOC entry 4976 (class 1259 OID 16700)
-- Name: idx_animals_sire_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animals_sire_id ON public.animals USING btree (sire_id);

--
-- TOC entry 4977 (class 1259 OID 16698)
-- Name: idx_animals_type_gender; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_animals_type_gender ON public.animals USING btree (animal_type, gender);

--
-- TOC entry 4990 (class 1259 OID 16738)
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);

--
-- TOC entry 4991 (class 1259 OID 16737)
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_type, actor_id);

--
-- TOC entry 4992 (class 1259 OID 16739)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

--
-- TOC entry 4982 (class 1259 OID 16709)
-- Name: idx_breeding_events_breeder_status_outcome; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_breeding_events_breeder_status_outcome ON public.breeding_events USING btree (breeder_id, status, outcome);

--
-- TOC entry 4983 (class 1259 OID 16712)
-- Name: idx_breeding_events_breeding_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_breeding_events_breeding_date ON public.breeding_events USING btree (breeder_id, breeding_date DESC);

--
-- TOC entry 4984 (class 1259 OID 16710)
-- Name: idx_breeding_events_dam_open; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_breeding_events_dam_open ON public.breeding_events USING btree (breeder_id, dam_id, status, outcome);

--
-- TOC entry 4985 (class 1259 OID 16711)
-- Name: idx_breeding_events_due_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_breeding_events_due_date ON public.breeding_events USING btree (breeder_id, expected_due_date);

--
-- TOC entry 4986 (class 1259 OID 16733)
-- Name: idx_breeding_events_status; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_breeding_events_status ON public.breeding_events USING btree (breeder_id, status, outcome);

--
-- TOC entry 5003 (class 1259 OID 16705)
-- Name: idx_fertility_records_animal_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_fertility_records_animal_date ON public.animal_fertility_records USING btree (animal_id, record_date DESC);

--
-- TOC entry 5000 (class 1259 OID 16704)
-- Name: idx_health_records_animal_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_health_records_animal_date ON public.animal_health_records USING btree (animal_id, record_date DESC);

--
-- TOC entry 5009 (class 1259 OID 16707)
-- Name: idx_offspring_records_animal_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_offspring_records_animal_date ON public.animal_offspring_records USING btree (animal_id, record_date DESC);

--
-- TOC entry 5013 (class 1259 OID 16734)
-- Name: idx_password_reset_tokens_breeder; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_password_reset_tokens_breeder ON public.password_reset_tokens USING btree (breeder_id);

--
-- TOC entry 5014 (class 1259 OID 16736)
-- Name: idx_password_reset_tokens_expiry; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_password_reset_tokens_expiry ON public.password_reset_tokens USING btree (expires_at);

--
-- TOC entry 5015 (class 1259 OID 16735)
-- Name: idx_password_reset_tokens_hash; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_password_reset_tokens_hash ON public.password_reset_tokens USING btree (token_hash);

--
-- TOC entry 5006 (class 1259 OID 16706)
-- Name: idx_production_records_animal_date; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX idx_production_records_animal_date ON public.animal_production_records USING btree (animal_id, record_date DESC);

--
-- TOC entry 4964 (class 1259 OID 16404)
-- Name: ix_admins_email; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE UNIQUE INDEX ix_admins_email ON public.admins USING btree (email);

--
-- TOC entry 4965 (class 1259 OID 16405)
-- Name: ix_admins_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_admins_id ON public.admins USING btree (id);

--
-- TOC entry 4978 (class 1259 OID 16464)
-- Name: ix_animals_animal_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE UNIQUE INDEX ix_animals_animal_id ON public.animals USING btree (animal_id);

--
-- TOC entry 4979 (class 1259 OID 16465)
-- Name: ix_animals_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_animals_id ON public.animals USING btree (id);

--
-- TOC entry 4993 (class 1259 OID 16535)
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);

--
-- TOC entry 4968 (class 1259 OID 16432)
-- Name: ix_breeders_email; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE UNIQUE INDEX ix_breeders_email ON public.breeders USING btree (email);

--
-- TOC entry 4969 (class 1259 OID 16431)
-- Name: ix_breeders_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_breeders_id ON public.breeders USING btree (id);

--
-- TOC entry 4970 (class 1259 OID 16433)
-- Name: ix_breeders_national_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE UNIQUE INDEX ix_breeders_national_id ON public.breeders USING btree (national_id);

--
-- TOC entry 4987 (class 1259 OID 16501)
-- Name: ix_breeding_events_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_breeding_events_id ON public.breeding_events USING btree (id);

--
-- TOC entry 5016 (class 1259 OID 16732)
-- Name: ix_password_reset_tokens_breeder_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_password_reset_tokens_breeder_id ON public.password_reset_tokens USING btree (breeder_id);

--
-- TOC entry 5017 (class 1259 OID 16731)
-- Name: ix_password_reset_tokens_id; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE INDEX ix_password_reset_tokens_id ON public.password_reset_tokens USING btree (id);

--
-- TOC entry 5018 (class 1259 OID 16730)
-- Name: ix_password_reset_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

-- Adds an index to improve lookup speed or enforce uniqueness.
CREATE UNIQUE INDEX ix_password_reset_tokens_token_hash ON public.password_reset_tokens USING btree (token_hash);

--
-- TOC entry 5035 (class 2606 OID 16605)
-- Name: animal_fertility_records animal_fertility_records_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_fertility_records
    ADD CONSTRAINT animal_fertility_records_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5036 (class 2606 OID 16610)
-- Name: animal_fertility_records animal_fertility_records_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_fertility_records
    ADD CONSTRAINT animal_fertility_records_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5033 (class 2606 OID 16581)
-- Name: animal_health_records animal_health_records_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_health_records
    ADD CONSTRAINT animal_health_records_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5034 (class 2606 OID 16586)
-- Name: animal_health_records animal_health_records_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_health_records
    ADD CONSTRAINT animal_health_records_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5031 (class 2606 OID 16557)
-- Name: animal_measurements animal_measurements_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_measurements
    ADD CONSTRAINT animal_measurements_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5032 (class 2606 OID 16562)
-- Name: animal_measurements animal_measurements_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_measurements
    ADD CONSTRAINT animal_measurements_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5041 (class 2606 OID 16679)
-- Name: animal_notes animal_notes_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_notes
    ADD CONSTRAINT animal_notes_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5042 (class 2606 OID 16684)
-- Name: animal_notes animal_notes_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_notes
    ADD CONSTRAINT animal_notes_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5039 (class 2606 OID 16653)
-- Name: animal_offspring_records animal_offspring_records_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_offspring_records
    ADD CONSTRAINT animal_offspring_records_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5040 (class 2606 OID 16658)
-- Name: animal_offspring_records animal_offspring_records_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_offspring_records
    ADD CONSTRAINT animal_offspring_records_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5037 (class 2606 OID 16629)
-- Name: animal_production_records animal_production_records_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_production_records
    ADD CONSTRAINT animal_production_records_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id) ON DELETE CASCADE;

--
-- TOC entry 5038 (class 2606 OID 16634)
-- Name: animal_production_records animal_production_records_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animal_production_records
    ADD CONSTRAINT animal_production_records_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id) ON DELETE CASCADE;

--
-- TOC entry 5024 (class 2606 OID 16459)
-- Name: animals animals_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id);

--
-- TOC entry 5025 (class 2606 OID 16454)
-- Name: animals animals_dam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES public.animals(id);

--
-- TOC entry 5026 (class 2606 OID 16449)
-- Name: animals animals_sire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES public.animals(id);

--
-- TOC entry 5023 (class 2606 OID 16426)
-- Name: breeders breeders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeders
    ADD CONSTRAINT breeders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admins(id);

--
-- TOC entry 5027 (class 2606 OID 16496)
-- Name: breeding_events breeding_events_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events
    ADD CONSTRAINT breeding_events_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id);

--
-- TOC entry 5028 (class 2606 OID 16481)
-- Name: breeding_events breeding_events_dam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events
    ADD CONSTRAINT breeding_events_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES public.animals(id);

--
-- TOC entry 5029 (class 2606 OID 16491)
-- Name: breeding_events breeding_events_offspring_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events
    ADD CONSTRAINT breeding_events_offspring_id_fkey FOREIGN KEY (offspring_id) REFERENCES public.animals(id);

--
-- TOC entry 5030 (class 2606 OID 16486)
-- Name: breeding_events breeding_events_sire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.breeding_events
    ADD CONSTRAINT breeding_events_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES public.animals(id);

--
-- TOC entry 5043 (class 2606 OID 16725)
-- Name: password_reset_tokens password_reset_tokens_breeder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Updates an existing table structure safely.
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_breeder_id_fkey FOREIGN KEY (breeder_id) REFERENCES public.breeders(id);

-- Completed on 2026-06-05 03:35:46

--
-- PostgreSQL database dump complete
--

\unrestrict 91xg92Kyf8gM8vpu2z8ea4cqxAuXzJpShgLCTGPJcX8QBsLv8fBO9W3ZiAGFEf1
