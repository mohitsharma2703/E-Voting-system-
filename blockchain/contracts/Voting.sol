// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Voting
 * @notice Academic-prototype e-voting contract supporting multiple elections.
 *
 * What lives ON-CHAIN: elections, candidate names, voter wallet authorizations,
 * one-vote-per-wallet flags and tallies.
 * What lives OFF-CHAIN (MongoDB): passwords, personal data, manifestos, KYC.
 *
 * PRIVACY WARNING: this is NOT a secret ballot. The VoteCast event and the
 * transaction itself link a wallet address to a candidate, and anyone can read
 * raw contract storage. Wallet-based duplicate prevention is also not identity
 * verification: one person could own several wallets.
 */
contract Voting is Ownable {
    // ---------------------------------------------------------------- types
    enum CandidateStatus { Pending, Approved, Rejected }

    struct Election {
        string title;
        string description;
        uint64 startTime;      // unix seconds
        uint64 endTime;        // unix seconds
        bool closed;          // admin closed it early
        uint32 candidateCount; // candidate ids run 1..candidateCount
        uint32 totalVotes;
        bool exists;
    }

    struct Candidate {
        string name;
        string metadataURI;   // pointer to off-chain profile (e.g. DB id); no personal data
        CandidateStatus status;
        uint32 voteCount;
    }

    // -------------------------------------------------------------- storage
    uint256 public electionCount; // election ids run 1..electionCount

    mapping(uint256 => Election) private elections;
    mapping(uint256 => mapping(uint256 => Candidate)) private candidates;
    mapping(uint256 => mapping(address => bool)) private authorizedVoters;
    mapping(uint256 => mapping(address => bool)) private hasVoted;

    // --------------------------------------------------------------- events
    event ElectionCreated(uint256 indexed electionId, string title, uint64 startTime, uint64 endTime);
    event ElectionUpdated(uint256 indexed electionId, string title, uint64 startTime, uint64 endTime);
    event ElectionClosed(uint256 indexed electionId);
    event CandidateRegistered(uint256 indexed electionId, uint256 indexed candidateId, string name);
    event CandidateStatusChanged(uint256 indexed electionId, uint256 indexed candidateId, CandidateStatus status);
    event VoterRegistered(uint256 indexed electionId, address indexed voter);
    event VoterRevoked(uint256 indexed electionId, address indexed voter);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);

    // ------------------------------------------------------------ modifiers
    modifier electionExists(uint256 electionId) {
        require(elections[electionId].exists, "Election does not exist");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ------------------------------------------------------ admin: elections
    function createElection(
        string calldata title,
        string calldata description,
        uint64 startTime,
        uint64 endTime
    ) external onlyOwner returns (uint256 electionId) {
        require(bytes(title).length > 0, "Title is required");
        require(endTime > startTime, "End must be after start");
        require(endTime > block.timestamp, "End time is in the past");

        electionId = ++electionCount;
        elections[electionId] = Election({
            title: title,
            description: description,
            startTime: startTime,
            endTime: endTime,
            closed: false,
            candidateCount: 0,
            totalVotes: 0,
            exists: true
        });
        emit ElectionCreated(electionId, title, startTime, endTime);
    }

    /// @notice Edit an election that has not started yet.
    function updateElection(
        uint256 electionId,
        string calldata title,
        string calldata description,
        uint64 startTime,
        uint64 endTime
    ) external onlyOwner electionExists(electionId) {
        Election storage e = elections[electionId];
        require(!e.closed, "Election is closed");
        require(block.timestamp < e.startTime, "Election already started");
        require(bytes(title).length > 0, "Title is required");
        require(endTime > startTime, "End must be after start");
        require(endTime > block.timestamp, "End time is in the past");

        e.title = title;
        e.description = description;
        e.startTime = startTime;
        e.endTime = endTime;
        emit ElectionUpdated(electionId, title, startTime, endTime);
    }

    /// @notice Close an election early. Results become visible immediately.
    function closeElection(uint256 electionId) external onlyOwner electionExists(electionId) {
        Election storage e = elections[electionId];
        require(!e.closed, "Election already closed");
        e.closed = true;
        emit ElectionClosed(electionId);
    }

    // ----------------------------------------------------- admin: candidates
    /// @notice Register a candidate (status Pending). Allowed only before voting starts.
    function addCandidate(
        uint256 electionId,
        string calldata name,
        string calldata metadataURI
    ) external onlyOwner electionExists(electionId) returns (uint256 candidateId) {
        Election storage e = elections[electionId];
        require(!e.closed, "Election is closed");
        require(block.timestamp < e.startTime, "Election already started");
        require(bytes(name).length > 0, "Candidate name is required");

        candidateId = ++e.candidateCount;
        candidates[electionId][candidateId] = Candidate({
            name: name,
            metadataURI: metadataURI,
            status: CandidateStatus.Pending,
            voteCount: 0
        });
        emit CandidateRegistered(electionId, candidateId, name);
    }

    function approveCandidate(uint256 electionId, uint256 candidateId) external onlyOwner {
        _setCandidateStatus(electionId, candidateId, CandidateStatus.Approved);
    }

    function rejectCandidate(uint256 electionId, uint256 candidateId) external onlyOwner {
        _setCandidateStatus(electionId, candidateId, CandidateStatus.Rejected);
    }

    function _setCandidateStatus(uint256 electionId, uint256 candidateId, CandidateStatus status)
        private
        electionExists(electionId)
    {
        Election storage e = elections[electionId];
        require(!e.closed, "Election is closed");
        require(block.timestamp < e.startTime, "Election already started");
        require(candidateId >= 1 && candidateId <= e.candidateCount, "Invalid candidate");

        candidates[electionId][candidateId].status = status;
        emit CandidateStatusChanged(electionId, candidateId, status);
    }

    // -------------------------------------------------------- admin: voters
    function authorizeVoter(uint256 electionId, address voter) external onlyOwner electionExists(electionId) {
        _authorize(electionId, voter);
    }

    function authorizeVoters(uint256 electionId, address[] calldata voters)
        external
        onlyOwner
        electionExists(electionId)
    {
        require(voters.length > 0 && voters.length <= 100, "Provide 1 to 100 voters");
        for (uint256 i = 0; i < voters.length; i++) {
            _authorize(electionId, voters[i]);
        }
    }

    function _authorize(uint256 electionId, address voter) private {
        require(voter != address(0), "Invalid voter address");
        require(!_hasEnded(elections[electionId]), "Election has ended");
        require(!authorizedVoters[electionId][voter], "Voter already authorized");
        authorizedVoters[electionId][voter] = true;
        emit VoterRegistered(electionId, voter);
    }

    /// @notice Remove authorization (only possible if the wallet has not voted yet).
    function revokeVoter(uint256 electionId, address voter) external onlyOwner electionExists(electionId) {
        require(authorizedVoters[electionId][voter], "Voter is not authorized");
        require(!hasVoted[electionId][voter], "Voter has already voted");
        authorizedVoters[electionId][voter] = false;
        emit VoterRevoked(electionId, voter);
    }

    // ---------------------------------------------------------------- voting
    /// @notice Cast exactly one vote for an approved candidate during the voting window.
    function castVote(uint256 electionId, uint256 candidateId) external electionExists(electionId) {
        Election storage e = elections[electionId];

        require(!e.closed, "Election is closed");
        require(block.timestamp >= e.startTime, "Election has not started");
        require(block.timestamp < e.endTime, "Election has ended");
        require(authorizedVoters[electionId][msg.sender], "Wallet is not authorized to vote");
        require(!hasVoted[electionId][msg.sender], "You have already voted");
        require(candidateId >= 1 && candidateId <= e.candidateCount, "Invalid candidate");

        Candidate storage c = candidates[electionId][candidateId];
        require(c.status == CandidateStatus.Approved, "Candidate is not approved");

        hasVoted[electionId][msg.sender] = true; // effects before any external interaction
        c.voteCount += 1;
        e.totalVotes += 1;

        emit VoteCast(electionId, msg.sender, candidateId);
    }

    // ----------------------------------------------------------------- views
    function getElection(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (
            string memory title,
            string memory description,
            uint64 startTime,
            uint64 endTime,
            bool closed,
            uint32 candidateCount,
            uint32 totalVotes,
            ElectionState state
        )
    {
        Election storage e = elections[electionId];
        return (e.title, e.description, e.startTime, e.endTime, e.closed, e.candidateCount, e.totalVotes, _state(e));
    }

    enum ElectionState { Upcoming, Active, Ended }

    function getElectionState(uint256 electionId) external view electionExists(electionId) returns (ElectionState) {
        return _state(elections[electionId]);
    }

    /// @notice Candidate details. voteCount is returned as 0 until the election has ended.
    function getCandidate(uint256 electionId, uint256 candidateId)
        external
        view
        electionExists(electionId)
        returns (string memory name, string memory metadataURI, CandidateStatus status, uint32 voteCount)
    {
        Election storage e = elections[electionId];
        require(candidateId >= 1 && candidateId <= e.candidateCount, "Invalid candidate");
        Candidate storage c = candidates[electionId][candidateId];
        uint32 shown = _hasEnded(e) ? c.voteCount : 0;
        return (c.name, c.metadataURI, c.status, shown);
    }

    /// @notice Final results. Only available once the election has ended or been closed.
    function getResults(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (uint256[] memory candidateIds, string[] memory names, uint32[] memory voteCounts)
    {
        Election storage e = elections[electionId];
        require(_hasEnded(e), "Results not available until election ends");

        uint32 n = e.candidateCount;
        candidateIds = new uint256[](n);
        names = new string[](n);
        voteCounts = new uint32[](n);
        for (uint32 i = 1; i <= n; i++) {
            Candidate storage c = candidates[electionId][i];
            candidateIds[i - 1] = i;
            names[i - 1] = c.name;
            voteCounts[i - 1] = c.voteCount;
        }
    }

    function isAuthorized(uint256 electionId, address voter) external view returns (bool) {
        return authorizedVoters[electionId][voter];
    }

    function hasAddressVoted(uint256 electionId, address voter) external view returns (bool) {
        return hasVoted[electionId][voter];
    }

    // -------------------------------------------------------------- internal
    function _hasEnded(Election storage e) private view returns (bool) {
        return e.closed || block.timestamp >= e.endTime;
    }

    function _state(Election storage e) private view returns (ElectionState) {
        if (_hasEnded(e)) return ElectionState.Ended;
        if (block.timestamp < e.startTime) return ElectionState.Upcoming;
        return ElectionState.Active;
    }
}
