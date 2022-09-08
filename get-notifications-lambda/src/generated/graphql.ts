export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Mutation = {
  __typename?: 'Mutation';
  updateThread: Scalars['String'];
};


export type MutationUpdateThreadArgs = {
  threadId: Scalars['String'];
};

export type Notification = {
  __typename?: 'Notification';
  /** github username whose activity originated this comment */
  author: Scalars['String'];
  /**
   * html text
   *
   * This text has been sanitized via https://www.npmjs.com/package/sanitize-html
   * and is safe to be embedded in client-side web pages.
   */
  html: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  getNotifications: Array<Notification>;
  getThreads: Array<Thread>;
};


export type QueryGetNotificationsArgs = {
  endNotificationIndex: Scalars['Int'];
  startNotificationIndex: Scalars['Int'];
  threadId: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  updatedThread?: Maybe<Scalars['String']>;
};

/** A `Thread` is a source of comments etc, e.g. a PR, issue.  */
export type Thread = {
  __typename?: 'Thread';
  /** If present, index of the last comment by this user */
  lastCommented?: Maybe<Scalars['Int']>;
  /** If present, index of the last comment that mentions this user */
  lastMentioned?: Maybe<Scalars['Int']>;
  /** If present, index of the last comment by someone that I have mentioned */
  lastResponded?: Maybe<Scalars['Int']>;
  /** github usernames that user has mentioned */
  mentionedByMe: Array<Maybe<Scalars['String']>>;
  /**
   * Maximum notification index `N` for this thread.
   *
   * Notifications are in the range `0..N` (exclusive).
   */
  numNotifications: Scalars['Int'];
  /** If present, index of the last comment that mentions a team I am on */
  teamLastMentioned?: Maybe<Scalars['Int']>;
  /**
   * Id of the thread with the structure `org/repo/kind/id`
   *
   * e.g., `rust-lang/rust/pulls/122`
   */
  threadId: Scalars['String'];
};
